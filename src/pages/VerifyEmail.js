import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ROUTES, SUCCESS_MESSAGES } from '../config/constants';
import './VerifyEmail.css';

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
      <div className="verify-email-page">
        <div className="verify-email-container">
          <LoadingSpinner size="large" message="Verifying your email..." />
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="verify-email-page">
        <div className="verify-email-container">
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p>Your email has been successfully verified.</p>
            <p>Redirecting you to login page...</p>
            <button 
              onClick={() => navigate(ROUTES.LOGIN)}
              className="login-btn"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-email-page">
      <div className="verify-email-container">
        <div className="error-state">
          <div className="error-icon">✕</div>
          <h1>Verification Failed</h1>
          <p className="error-message">{errorMessage}</p>
          <p>The verification link may have expired or is invalid.</p>

          <div className="resend-section">
            <h3>Resend Verification Email</h3>
            <form onSubmit={handleResendVerification}>
              <input
                type="email"
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                disabled={isResending}
              />
              <button 
                type="submit" 
                className="resend-btn"
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Email'}
              </button>
            </form>
          </div>

          <div className="footer-links">
            <button onClick={() => navigate(ROUTES.LOGIN)} className="link-btn">
              Back to Login
            </button>
            <button onClick={() => navigate(ROUTES.SIGNUP)} className="link-btn">
              Create New Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;