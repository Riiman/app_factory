
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { useToast } from '../context/ToastContext';
import { isValidEmail } from '../utils/helpers';
import { ROUTES, SUCCESS_MESSAGES } from '../config/constants';
import './ForgotPassword.css';

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
      <div className="forgot-password-page">
        <div className="forgot-password-container">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Check Your Email</h2>
            <p>We've sent password reset instructions to:</p>
            <p className="email-sent"><strong>{email}</strong></p>
            <p>Didn't receive the email? Check your spam folder.</p>
            <Link to={ROUTES.LOGIN} className="back-to-login">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <h1>Reset Password</h1>
        <p className="subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="links">
          <Link to={ROUTES.LOGIN}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
