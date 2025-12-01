import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../utils/api';
import { GoogleIcon, LinkedInIcon } from '../components/Icons';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, RecaptchaVerifier, linkWithPhoneNumber, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useAuth } from '../contexts/AuthContext';

const SignupPage: FC = () => {
  const navigate = useNavigate();
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

  // Redirect if user is already logged in and not in the middle of verification
  useEffect(() => {
    if (user && !confirmationResult && !isSigningUp && !isMockVerification) {
      navigate('/');
    }
  }, [user, confirmationResult, navigate, isSigningUp, isMockVerification]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
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
      // Create backend user immediately to prevent AuthContext from logging out
      await api.post('/auth/signup', {
        firebase_id_token: idToken,
        full_name: fullName,
        email: firebaseUser.email,
        phone_number: phoneNumber || firebaseUser.phoneNumber,
      });

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
      setError(err.message || 'An unknown error occurred during signup.');
      setIsSigningUp(false); // Reset on error
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
    <AuthFormWrapper
      title="Create your new account"
      footer={<>Already a member? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link></>}
    >
      {!confirmationResult ? (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input id="name-signup" label="Full Name" type="text" required value={fullName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} />
          <Input id="email-signup" label="Email address" type="email" required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
          <Input id="password-signup" label="Password" type="password" required value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
          <Input id="phone-signup" label="Phone Number (e.g., +15551234567)" type="tel" required value={phoneNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)} />
          <div id="recaptcha-container"></div>
          <div><Button type="submit" className="w-full justify-center">Create Account</Button></div>
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
        <div className="mt-6 grid grid-cols-2 gap-3">
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
          <div>
            <a href="http://127.0.0.1:5000/api/auth/linkedin/login" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
              <span className="sr-only">Sign up with LinkedIn</span>
              <LinkedInIcon />
            </a>
          </div>
        </div>
      </div>
    </AuthFormWrapper>
  );
};

export default SignupPage;