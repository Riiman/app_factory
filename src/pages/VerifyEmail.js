import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './AuthPages.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await axios.post('http://localhost:5000/api/verify-email', { token });
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Verification failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container verify-container">
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <FaCheckCircle className="status-icon success" />
            <h2>Email Verified!</h2>
            <p>{message}</p>
            <p>Redirecting to login page...</p>
            <Link to="/login" className="auth-button">Go to Login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <FaTimesCircle className="status-icon error" />
            <h2>Verification Failed</h2>
            <p>{message}</p>
            <div className="auth-footer">
              <p><Link to="/signup">Sign Up Again</Link></p>
              <p><Link to="/">Back to Home</Link></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
