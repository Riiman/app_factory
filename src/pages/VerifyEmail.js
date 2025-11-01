import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import { useToast } from '../context/ToastContext';
import { ROUTES, SUCCESS_MESSAGES } from '../config/constants';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Link, Alert, AlertTitle } from '@mui/material';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmailToken();
    } else {
      setVerificationStatus('error');
      setErrorMessage('Invalid verification link');
    }
  }, [token]);

  const verifyEmailToken = async () => {
    try {
      await authService.verifyEmail(token);
      setVerificationStatus('success');
      showSuccess(SUCCESS_MESSAGES.EMAIL_VERIFIED);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 3000);
    } catch (err) {
      setVerificationStatus('error');
      const errorMsg = err.message || 'Email verification failed';
      setErrorMessage(errorMsg);
      showError(errorMsg);
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();

    if (!resendEmail) {
      showError('Please enter your email address');
      return;
    }

    setIsResending(true);

    try {
      await authService.resendVerification(resendEmail);
      showSuccess('Verification email sent! Please check your inbox.');
      setResendEmail('');
    } catch (err) {
      const errorMsg = err.message || 'Failed to resend verification email';
      showError(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  if (verificationStatus === 'verifying') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Verifying your email...</Typography>
      </Box>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Alert severity="success" iconMapping={{ success: <CheckCircleOutlineIcon fontSize="inherit" /> }}>
            <AlertTitle>Email Verified!</AlertTitle>
            <Typography variant="body1" paragraph>
              Your email has been successfully verified.
            </Typography>
            <Typography variant="body2" paragraph>
              Redirecting you to the login page...
            </Typography>
            <Button 
              variant="contained"
              onClick={() => navigate(ROUTES.LOGIN)}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
          <AlertTitle>Verification Failed</AlertTitle>
          <Typography variant="body1" paragraph>{errorMessage}</Typography>
          <Typography variant="body2" paragraph>
            The verification link may have expired or is invalid.
          </Typography>
        </Alert>

        <Box sx={{ width: '100%', mt: 3 }}>
          <Typography variant="h6" gutterBottom>Resend Verification Email</Typography>
          <Box component="form" onSubmit={handleResendVerification} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="resend-email"
              label="Enter your email"
              name="resendEmail"
              autoComplete="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              disabled={isResending}
            />
            <Button 
              type="submit" 
              fullWidth
              variant="contained"
              sx={{ mt: 2, mb: 2 }}
              disabled={isResending}
            >
              {isResending ? <CircularProgress size={24} color="inherit" /> : 'Resend Email'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Link component={RouterLink} to={ROUTES.LOGIN} variant="body2">
            Back to Login
          </Link>
          <Link component={RouterLink} to={ROUTES.SIGNUP} variant="body2">
            Create New Account
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default VerifyEmail;