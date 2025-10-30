
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROUTES, SUCCESS_MESSAGES } from '../config/constants';
import './AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user, startup } = useAuth(); // We don't need startup here anymore
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
    // If a user is already logged in when they visit the login page,
    // redirect them away. This prevents a logged-in user from seeing the login screen.
    if (user){
      console.log('Founder user: ', user)
      // if (startup && startup.submission_id) {
      //   console.log("Running use effect in Login.js")
      // // A simple redirect to home is safe. The App router will handle further redirection if needed.
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
      // The login function from AuthContext returns { success, startup }
      const result = await login(formData.email, formData.password);

      if (result.success) {
        showSuccess(SUCCESS_MESSAGES.LOGIN_SUCCESS);

        // If the user has a startup submission, go to the dashboard.
        if (result.startup && result.startup.submission_id) {
          console.log("Logged in. Startup found. Redirecting to Dashboard.js...  " , result.startup);
          navigate(`${ROUTES.DASHBOARD}`);
        } else {
          // If it's a new user with no submission, go to the submission form.
          // Note: Using ROUTES.SUBMISSIONS from your constants file.
          console.log('Logged in. No startup found. Redirecting to Submission Form.js...  ', result.startup);
          navigate(ROUTES.SUBMISSIONS);
        }
      } else {
        // This part handles login failures (e.g., wrong password)
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
      // Assuming there's a resend verification function in authService
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Welcome Back!</h1>
          <p>Sign in to access your startup dashboard</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {showResend && (
            <div className="resend-verification-section">
              <button
                type="button"
                onClick={handleResendVerification}
                className="resend-btn"
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
          <p><Link to="/">Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
