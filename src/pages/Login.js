
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROUTES, SUCCESS_MESSAGES } from '../config/constants';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Link } from '@mui/material';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (user){
      console.log('Founder user: ', user)
      navigate(ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        showSuccess(SUCCESS_MESSAGES.LOGIN_SUCCESS);

        if (result.startup && result.startup.submission_id) {
          console.log("Logged in. Startup found. Redirecting to Dashboard.js...  " , result.startup);
          navigate(`${ROUTES.DASHBOARD}`);
        } else {
          console.log('Logged in. No startup found. Redirecting to Submission Form.js...  ', result.startup);
          navigate(ROUTES.SUBMISSIONS);
        }
      } else {
        const errorMessage = result.error || 'Login failed. Please try again.';
        setError(errorMessage);
        showError(errorMessage);
        if (result.reason === 'not_verified') {
          setShowResend(true);
        }
      }
    } catch (err) {
      const message = err.response?.data?.error || 'An unexpected error occurred.';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      showError('Please enter your email address first.');
      return;
    }
    setIsResending(true);
    try {
      await authService.resendVerification(formData.email);
      showSuccess(SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT);
      setShowResend(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to resend email.';
      showError(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Welcome Back!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Sign in to access your startup dashboard
        </Typography>

        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
          />

          {showResend && (
            <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
              <Button
                type="button"
                variant="outlined"
                onClick={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2, mb: 1 }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Link component={RouterLink} to={ROUTES.SIGNUP} variant="body2">
            Don't have an account? Sign Up
          </Link>
          <br />
          <Link component={RouterLink} to={ROUTES.FORGOT_PASSWORD} variant="body2">
            Forgot password?
          </Link>
          <br />
          <Link component={RouterLink} to="/" variant="body2">
            Back to Home
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
