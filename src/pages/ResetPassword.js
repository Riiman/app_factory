
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import { useToast } from '../context/ToastContext';
import { isValidPassword } from '../utils/helpers';
import { ROUTES, SUCCESS_MESSAGES, VALIDATION } from '../config/constants';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Link, Alert } from '@mui/material';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      showError('Invalid or missing reset token');
    }
  }, [token, showError]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.resetPassword(token, formData.password);
      showSuccess(SUCCESS_MESSAGES.PASSWORD_RESET);
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 2000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to reset password';
      showError(errorMessage);
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setTokenValid(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenValid) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" color="error" gutterBottom>
            Invalid Reset Link
          </Typography>
          <Typography variant="body1" paragraph>
            This password reset link is invalid or has expired.
          </Typography>
          <Typography variant="body1" paragraph>
            Please request a new password reset link.
          </Typography>
          <Button 
            variant="contained"
            onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
            sx={{ mt: 2 }}
          >
            Request New Link
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Create New Password
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
          Enter your new password below.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="password"
            label="New Password"
            name="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting}
            error={!!errors.password}
            helperText={errors.password}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1, mb: 2, display: 'block' }}>
            Password must be at least {VALIDATION.PASSWORD_MIN_LENGTH} characters
          </Typography>

          <TextField
            margin="normal"
            required
            fullWidth
            id="confirmPassword"
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
