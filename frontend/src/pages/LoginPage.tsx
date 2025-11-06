import React, { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormWrapper from '../components/AuthFormWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { GoogleIcon, LinkedInIcon } from '../components/Icons';
import api from '../utils/api';
import { useAuthRedirect } from '../utils/useAuthRedirect';

const LoginPage: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { handleNavigation } = useAuthRedirect();

  // If user is already authenticated, redirect them
  useEffect(() => {
    if (localStorage.getItem('user')) {
      // The useAuthRedirect hook will handle the actual redirection logic
      // We just need to ensure this page doesn't render if already logged in
      // The hook's useEffect will trigger the navigation.
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies with the request
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        handleNavigation(data.submission_status);
      } else {
        setError(data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <AuthFormWrapper
        title="Sign in to your account"
        footer={<>Not a member? <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">Create an account</Link></>}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Input id="email-login" label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input id="password-login" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <div>
          <Button type="submit" className="w-full justify-center">Sign in</Button>
        </div>
      </form>
    </AuthFormWrapper>
  );
};

export default LoginPage;