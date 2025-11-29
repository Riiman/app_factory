import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../utils/api';
import { GoogleIcon, LinkedInIcon } from '../components/Icons';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const SignupPage: FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // New state for phone number
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null); // For phone verification
  const [verificationCode, setVerificationCode] = useState(''); // For SMS input
  const [recaptchaResolved, setRecaptchaResolved] = useState(false); // To track reCAPTCHA status


  useEffect(() => {
    if (!recaptchaResolved && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => { setRecaptchaResolved(true); },
        'expired-callback': () => { setRecaptchaResolved(false); setError('reCAPTCHA expired. Please try again.'); }
      });
      window.recaptchaVerifier.render();
    }
  }, [recaptchaResolved]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // After a successful popup sign-in, the onAuthStateChanged listener
      // in useAuth will handle everything. We just need to trigger a reload
      // to ensure the app re-initializes and the listener fires.
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: fullName });
      await sendEmailVerification(firebaseUser);
      setMessage('Verification email sent.');

      if (phoneNumber && recaptchaResolved) {
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        setConfirmationResult(confirmation);
        setMessage('Verification email and SMS code sent.');
      }

      const idToken = await firebaseUser.getIdToken();
      await api.post('/auth/signup', {
        firebase_id_token: idToken,
        full_name: fullName,
        email: firebaseUser.email,
        phone_number: firebaseUser.phoneNumber || phoneNumber,
      });

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during signup.');
    }
  };

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
                    await confirmationResult.confirm(verificationCode);
                    setMessage('Phone number verified! Redirecting...');
                    setTimeout(() => {
                      navigate('/'); // Use navigate to stay within SPA
                    }, 2000);    } catch (err: any) {
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
          <Input id="name-signup" label="Full Name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input id="email-signup" label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input id="password-signup" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input id="phone-signup" label="Phone Number (e.g., +15551234567)" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          <div id="recaptcha-container"></div>
          <div><Button type="submit" className="w-full justify-center">Create Account</Button></div>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handlePhoneVerification}>
          <Input id="sms-code" label="Verification Code" type="text" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
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