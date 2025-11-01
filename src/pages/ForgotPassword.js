
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import { useToast } from '../context/ToastContext';
import { isValidEmail } from '../utils/helpers';
import { ROUTES, SUCCESS_MESSAGES } from '../config/constants';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Link, Alert } from '@mui/material';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email);
      setEmailSent(true);
      showSuccess(SUCCESS_MESSAGES.EMAIL_SENT);
    } catch (err) {
      const errorMessage = err.message || 'Failed to send reset email';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" gutterBottom>
            Check Your Email
          </Typography>
          <Typography variant="body1" paragraph>
            We've sent password reset instructions to:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
            {email}
          </Typography>
          <Typography variant="body2" paragraph>
            Didn't receive the email? Check your spam folder.
          </Typography>
          <Link component={RouterLink} to={ROUTES.LOGIN} variant="button" sx={{ mt: 2 }}>
            Back to Login
          </Link>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
          </Button>
        </Box>
        <Link component={RouterLink} to={ROUTES.LOGIN} variant="body2">
          Back to Login
        </Link>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
