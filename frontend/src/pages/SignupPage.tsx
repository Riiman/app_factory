import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../utils/api';
import { GoogleIcon, LinkedInIcon } from '../components/Icons';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, RecaptchaVerifier, linkWithPhoneNumber, GoogleAuthProvider, signOut, signInWithPopup } from "firebase/auth";
import { useAuth } from '../contexts/AuthContext';
import OrganizationSelectionModal from '../components/auth/OrganizationSelectionModal';

const SignupPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // New state for phone number
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null); // For phone verification
  const [verificationCode, setVerificationCode] = useState(''); // For SMS input
  const [recaptchaResolved, setRecaptchaResolved] = useState(false); // To track reCAPTCHA status
  const [isSigningUp, setIsSigningUp] = useState(false); // To prevent redirect during signup flow
  const [isMockVerification, setIsMockVerification] = useState(false); // For development without billing
  const [signupMode, setSignupMode] = useState<'create' | 'join'>('create'); // 'create' or 'join'
  const [organizationName, setOrganizationName] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  // OAuth organization modal state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [pendingOAuthToken, setPendingOAuthToken] = useState<string | null>(null);
  const [isOrgModalLoading, setIsOrgModalLoading] = useState(false);

  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => { setRecaptchaResolved(true); },
        'expired-callback': () => { setRecaptchaResolved(false); setError('reCAPTCHA expired. Please try again.'); }
      });
      (window as any).recaptchaVerifier.render();
    }
  }, []);

  // Check if user was redirected from login with Firebase token
  useEffect(() => {
    const state = location.state as { firebaseToken?: string; email?: string } | null;
    if (state?.firebaseToken) {
      // User came from Google sign-in on login page
      // Show organization modal immediately
      setPendingOAuthToken(state.firebaseToken);
      setShowOrgModal(true);
      setEmail(state.email || '');
    }
  }, [location]);

  // Redirect if user is already logged in and not in the middle of verification
  useEffect(() => {
    if (user && !confirmationResult && !isSigningUp && !isMockVerification) {
      window.location.href = '/';
    }
  }, [user, confirmationResult, navigate, isSigningUp, isMockVerification]);



  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      // For new users signing up via Google, show organization modal immediately
      setPendingOAuthToken(idToken);
      setShowOrgModal(true);
      setEmail(firebaseUser.email || '');
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to sign in with Google.';
      setError(errorMessage);
      // If backend failed, sign out from Firebase to reset state
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

      // For new Google users, use the appropriate signup endpoint
      if (mode === 'create') {
        const response = await api.post('/auth/organization/signup', {
          firebase_id_token: pendingOAuthToken,
          organization_name: value,
          email: email
        });

        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        const response = await api.post('/auth/signup', {
          firebase_id_token: pendingOAuthToken,
          organization_id: value, // This is the invite code
          email: email
        });

        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      setShowOrgModal(false);
      setPendingOAuthToken(null);
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error("Organization assignment error:", err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to assign organization.';
      setError(errorMessage);
      throw err; // Re-throw to let modal handle it
    } finally {
      setIsOrgModalLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSigningUp(true); // Start signup flow

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: fullName });
      await sendEmailVerification(firebaseUser);

      const idToken = await firebaseUser.getIdToken();


      if (signupMode === 'create') {
        await api.post('/auth/organization/signup', {
          firebase_id_token: idToken,
          organization_name: organizationName,
          full_name: fullName,
          email: firebaseUser.email,
          phone_number: phoneNumber || firebaseUser.phoneNumber,
        });
      } else {
        await api.post('/auth/signup', {
          firebase_id_token: idToken,
          organization_id: organizationId,
          full_name: fullName,
          email: firebaseUser.email,
          phone_number: phoneNumber || firebaseUser.phoneNumber,
        });
      }

      setMessage('Account created. Redirecting to login...');

      // Skip phone verification for now
      setTimeout(async () => {
        await signOut(auth);
        navigate('/login');
      }, 1500);

      /*
      try {
          // Use linkWithPhoneNumber instead of signInWithPhoneNumber
          const confirmation = await linkWithPhoneNumber(firebaseUser, phoneNumber, (window as any).recaptchaVerifier);
          setConfirmationResult(confirmation);
          setMessage('Verification email sent. SMS code sent to your phone.');
      } catch (smsError: any) {
          console.error("SMS Verification Error:", smsError);
          if (smsError.code === 'auth/billing-not-enabled') {
              // Fallback for development
              setIsMockVerification(true);
              setConfirmationResult({ confirm: () => Promise.resolve() }); // Mock confirmation object
              setMessage('Development Mode: Billing not enabled. Use code 123456 to verify.');
          } else {
              throw smsError;
          }
      }
      */

    } catch (err: any) {
      console.error("Signup Error:", err);

      let errorMessage = 'An unknown error occurred during signup.';

      // Handle Firebase Auth Errors specially
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'A user with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.response?.data?.error) {
        // Backend error
        errorMessage = err.response.data.error;
      } else if (err.message) {
        // Fallback to error message, stripping "Firebase: " prefix if present for cleaner look
        errorMessage = err.message.replace('Firebase: ', '');
      }

      setError(errorMessage);
      setIsSigningUp(false); // Reset on error

      // If error is related to existing user, sign out ensures clean state
      if (
        errorMessage.toLowerCase().includes('user already exists') ||
        errorMessage.toLowerCase().includes('auth/email-already-in-use') ||
        err.code === 'auth/email-already-in-use'
      ) {
        await signOut(auth);
      }
    }
  };

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isMockVerification) {
        if (verificationCode === '123456') {
          setMessage('Phone number verified (Mock)! Redirecting to login...');
          setTimeout(async () => {
            await signOut(auth); // Log out user
            navigate('/login');
          }, 2000);
          return;
        } else {
          throw new Error('Invalid mock verification code. Use 123456.');
        }
      }

      await confirmationResult.confirm(verificationCode);
      setMessage('Phone number verified! Redirecting to login...');

      // Update backend to set phone_verified = true (handled by sync usually, but we are logging out)
      // Since we are logging out, the next login will sync the status.

      setTimeout(async () => {
        await signOut(auth); // Log out user
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
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
        title="Create your new account"
        footer={<>Already a member? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link></>}
      >
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          <button
            type="button"
            onClick={() => setSignupMode('create')}
            className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium ${signupMode === 'create' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Create Organization
          </button>
          <button
            type="button"
            onClick={() => setSignupMode('join')}
            className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium ${signupMode === 'join' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Join Organization
          </button>
        </div>

        {!confirmationResult ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input id="name-signup" label="Full Name" type="text" required value={fullName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} />
            <Input id="email-signup" label="Email address" type="email" required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            <Input id="password-signup" label="Password" type="password" required value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
            <Input id="phone-signup" label="Phone Number (e.g., +15551234567)" type="tel" required value={phoneNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)} />

            {signupMode === 'create' ? (
              <Input id="org-name" label="Organization Name" type="text" required value={organizationName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)} placeholder="e.g. Acme Corp" />
            ) : (
              <Input id="org-id" label="Organization Invite Code" type="text" required value={organizationId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationId(e.target.value)} placeholder="e.g. 9c3c2dde" />
            )}

            <div id="recaptcha-container"></div>
            <div>
              <Button type="submit" className="w-full justify-center" disabled={isSigningUp}>
                {isSigningUp ? 'Signing up...' : (signupMode === 'create' ? 'Create & Signup' : 'Join & Signup')}
              </Button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handlePhoneVerification}>
            <Input id="sms-code" label="Verification Code" type="text" required value={verificationCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)} />
            <Button type="submit" className="w-full justify-center">Verify Phone</Button>
          </form>
        )}
        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
        {message && <p className="text-green-500 text-sm text-center mt-4">{message}</p>}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or sign up with</span></div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3">
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Sign up with Google</span>
                <GoogleIcon />
              </button>
            </div>
          </div>
        </div>
      </AuthFormWrapper>
      <Footer />

      {/* Organization Selection Modal for OAuth users */}
      <OrganizationSelectionModal
        isOpen={showOrgModal}
        onClose={() => {
          setShowOrgModal(false);
          setPendingOAuthToken(null);
          signOut(auth); // Sign out if user cancels
        }}
        onSubmit={handleOrgModalSubmit}
        isLoading={isOrgModalLoading}
      />
    </div>
  );
};

export default SignupPage;