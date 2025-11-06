import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

export const useAuthRedirect = () => {
  const navigate = useNavigate();

  const handleNavigation = async (submissionStatus: string | null) => {
    if (!submissionStatus) {
      navigate('/submission');
    } else {
      switch (submissionStatus) {
        case 'pending':
        case 'in_review':
          navigate('/pending-review');
          break;
        case 'approved':
          navigate('/dashboard');
          break;
        case 'rejected':
          navigate('/rejected-submission');
          break;
        default:
          navigate('/submission'); // Fallback
          break;
      }
    }
  };

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const user = localStorage.getItem('user');
      if (user) {
        // User is authenticated, fetch their submission status
        try {
          const response = await api.fetch('/auth/status');
          const data = await response.json();

          if (response.ok && data.success) {
            handleNavigation(data.submission_status);
          } else {
            // If status check fails, redirect to login (api.fetch handles 401)
            navigate('/login?error=status_check_failed');
          }
        } catch (error) {
          // Network error or other issue, redirect to login
          navigate('/login?error=network_error');
        }
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  return { handleNavigation };
};
