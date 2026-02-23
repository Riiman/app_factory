import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { GoogleIcon } from '../components/Icons';
import api from '../utils/api';
import { auth } from '../firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { useAuth } from '../contexts/AuthContext';
import OrganizationSelectionModal from '../components/auth/OrganizationSelectionModal';

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const { user, startupSlug } = useAuth();
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // OAuth organization modal state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [pendingOAuthToken, setPendingOAuthToken] = useState<string | null>(null);
  const [isOrgModalLoading, setIsOrgModalLoading] = useState(false);

  // Resend Verification State
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setError('');
      alert("Verification email sent! Please check your inbox.");
      setShowResend(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend email.');
    } finally {
      setResendLoading(false);
    }
  };

  // Helper to validate tenant access
  const validateTenantAccess = (userData: any) => {
    if (!orgSlug) return true; // Global login is always valid context-wise

    // Check if user's organization slug matches the URL slug
    const userOrgSlug = userData.organization?.slug;

    if (userOrgSlug === orgSlug) {
      return true;
    }

    return false;
  };

  const getDashboardPath = (userData: any) => {
    // Always direct to the user's actual organization dashboard
    const slug = userData.organization?.slug;
    return slug ? `/${slug}/dashboard` : (startupSlug ? `/${startupSlug}/dashboard` : '/dashboard');
  };

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // Validate context if we are already logged in
      if (orgSlug && user.organization?.slug !== orgSlug) {
        setError("You are logged in to a different organization. Please sign out to switch.");
      } else {
        if (user.role?.toUpperCase() === 'ADMIN' || user.role === 'admin') {
          navigate('/admin');
        } else {
          const dest = orgSlug ? `/${orgSlug}/dashboard` : (startupSlug ? `/${startupSlug}/dashboard` : '/dashboard');
          navigate(dest);
        }
      }
    }
  }, [user, navigate, orgSlug, startupSlug]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      try {
        const data = await api.post('/auth/login', { firebase_id_token: idToken });

        if (data.success) {
          // STRICT CHECK: Tenant Mismatch
          if (orgSlug && data.user.organization?.slug !== orgSlug) {
            setError("You do not belong to this organization.");
            await signOut(auth); // Reject session
            return;
          }

          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));

          if (data.user.role?.toUpperCase() === 'ADMIN' || data.user.role === 'admin') {
            const orgSlug = data.user.organization?.slug;
            window.location.href = orgSlug ? `/${orgSlug}/admin` : '/admin';
          } else {
            window.location.href = getDashboardPath(data.user);
          }
        } else if (data.requires_signup) {
          // If on tenant route, we might want to carry that context
          const signupPath = orgSlug ? `/${orgSlug}/signup` : '/signup';
          navigate(signupPath, {
            state: {
              firebaseToken: idToken,
              email: data.email
            }
          });
        } else if (data.requires_organization) {

          if (orgSlug) {
            // If trying to login to specific tenant but has no org -> They clearly don't belong here.
            setError("You do not have an account in this organization.");
            await signOut(auth);
          } else {
            setPendingOAuthToken(data.access_token);
            setShowOrgModal(true);
          }

        } else {
          setError(data.error || 'An unknown error occurred.');
        }
      } catch (err: any) {
        console.error("Inner API call failed:", err);
        throw err;
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to sign in with Google.';
      setError(errorMessage);
      await signOut(auth);
    }
  };

  const handleOrgModalSubmit = async (mode: 'create' | 'join', value: string) => {
    setIsOrgModalLoading(true);
    setError('');

    try {
      if (!pendingOAuthToken) {
        throw new Error('No authentication token found');
      }
      const payload = mode === 'create'
        ? { mode: 'create', organization_name: value }
        : { mode: 'join', invite_code: value };

      localStorage.setItem('access_token', pendingOAuthToken);
      const response = await api.post('/auth/assign-organization', payload);

      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setShowOrgModal(false);
      setPendingOAuthToken(null);
      window.location.href = getDashboardPath(response.user);

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to assign organization.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsOrgModalLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const idToken = await firebaseUser.getIdToken();

      const data = await api.post('/auth/login', { firebase_id_token: idToken });

      if (data.access_token) {
        // STRICT CHECK: Tenant Mismatch
        if (orgSlug && data.user.organization?.slug !== orgSlug) {
          setError("You do not belong to this organization.");
          await signOut(auth); // Reject session
          return;
        }

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (data.user.role?.toUpperCase() === 'ADMIN' || data.user.role === 'admin') {
          const orgSlug = data.user.organization?.slug;
          window.location.href = orgSlug ? `/${orgSlug}/admin` : '/admin';
        } else {
          window.location.href = getDashboardPath(data.user);
        }
      } else {
        if (data.requires_organization) {
          if (orgSlug) {
            setError("You do not have an account in this organization.");
            await signOut(auth);
          } else {
            setError("Organization required. Please contact support.");
          }
        } else {
          setError(data.error || 'An unknown error occurred.');
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email address before logging in.');
        setShowResend(true);
      } else {
        console.error("Firebase login error:", err);
        setError(err.message || 'Failed to connect to the server.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 justify-center">
            <div className="flex items-center cursor-pointer">
              <Link to="/" className="text-3xl font-bold bg-clip-text text-transparent animate-gradient-x">
                VentureStack
              </Link>
            </div>
          </div>
        </div>
      </header>
      <AuthFormWrapper
        title={orgSlug ? "Sign in to your organization" : "Sign in to your account"}
        footer={<>Not a member? <Link to={orgSlug ? `/${orgSlug}/signup` : "/signup"} className="font-medium text-blue-600 hover:text-blue-500">Create an account</Link></>}
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input id="email-login" label="Email address" type="email" required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
          <Input id="password-login" label="Password" type="password" required value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Forgot your password?
            </Link>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {showResend && (
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          <div>
            <Button type="submit" className="w-full justify-center">
              {orgSlug ? "Sign in" : "Sign in"}
            </Button>
          </div>
        </form>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or sign in with</span></div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3">
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <span className="sr-only">Sign in with Google</span>
                <GoogleIcon />
              </button>
            </div>
          </div>
        </div>
      </AuthFormWrapper>
      <Footer />

      <OrganizationSelectionModal
        isOpen={showOrgModal}
        onClose={() => {
          setShowOrgModal(false);
          setPendingOAuthToken(null);
          signOut(auth);
        }}
        onSubmit={handleOrgModalSubmit}
        isLoading={isOrgModalLoading}
      />
    </div>
  );
};

export default LoginPage;
