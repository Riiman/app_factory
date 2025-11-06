import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../utils/api';
import { useAuthRedirect } from '../utils/useAuthRedirect';
import { GoogleIcon, LinkedInIcon } from '../components/Icons';

const SignupPage: FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  useAuthRedirect();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await api.fetch('/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Signup successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <AuthFormWrapper
      title="Create your new account"
      footer={<>Already a member? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link></>}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Input id="name-signup" label="Full Name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input id="email-signup" label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input id="password-signup" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {message && <p className="text-green-500 text-sm text-center">{message}</p>}
        <div>
          <Button type="submit" className="w-full justify-center">Create Account</Button>
        </div>
      </form>
      <div className="mt-6">
        <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or sign up with</span></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
                <a href="http://127.0.0.1:5000/auth/google/login" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span className="sr-only">Sign up with Google</span>
                    <GoogleIcon />
                </a>
            </div>
            <div>
                <a href="http://127.0.0.1:5000/auth/linkedin/login" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
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