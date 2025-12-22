import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { GoogleIcon, LinkedInIcon } from '../components/Icons';
import api from '../utils/api';
import { auth } from '../firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword
} from "firebase/auth";
import { useAuth } from '../contexts/AuthContext';

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);




  const handleGoogleSignIn = async () => {
    console.log("handleGoogleSignIn called (Popup flow)");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      const data = await api.post('/auth/login', { firebase_id_token: idToken });

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.error || 'An unknown error occurred.');
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err.message || 'Failed to sign in with Google.');
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
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.error || 'An unknown error occurred.');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
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
              <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500">
                VentureStack
              </Link>
            </div>
          </div>
        </div>
      </header>
      <AuthFormWrapper
        title="Sign in to your account"
        footer={<>Not a member? <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">Create an account</Link></>}
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input id="email-login" label="Email address" type="email" required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
          <Input id="password-login" label="Password" type="password" required value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <Button type="submit" className="w-full justify-center">Sign in</Button>
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
    </div>
  );
};

export default LoginPage;
