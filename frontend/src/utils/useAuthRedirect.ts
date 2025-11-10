import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import { User } from '../types/dashboard-types';

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationInProgress = useRef(false);

  const handleNavigation = (user: User | null, submissionStatus: string | null) => {
    if (navigationInProgress.current) return;

    let targetPath: string;

    if (user && user.role === 'ADMIN') {
      targetPath = '/admin';
      if (location.pathname.startsWith(targetPath)) {
        return; // Already on an admin page, do nothing.
      }
    } else {
      if (!submissionStatus) {
        targetPath = '/submission';
      } else {
        switch (submissionStatus) {
          case 'pending':
          case 'in_review':
            targetPath = '/pending-review';
            break;
          case 'approved':
            targetPath = '/dashboard';
            break;
          case 'rejected':
            targetPath = '/rejected-submission';
            break;
          default:
            targetPath = '/submission'; // Fallback
            break;
        }
      }
      if (location.pathname === targetPath) {
        return; // Already on the correct page, do nothing.
      }
    }
    
    navigationInProgress.current = true;
    navigate(targetPath);
  };

  useEffect(() => {
    navigationInProgress.current = false; // Reset lock on every new location

    const checkAuthAndRedirect = async () => {
      const userStr = localStorage.getItem('user');
      const isPublicPage = ['/login', '/signup'].includes(location.pathname);

      if (!userStr) {
        if (!isPublicPage) {
          if (navigationInProgress.current) return;
          navigationInProgress.current = true;
          navigate('/login');
        }
        return;
      }

      try {
        const user: User = JSON.parse(userStr);
        const response = await api.fetch('/auth/status');
        const data = await response.json();

        if (response.ok && data.success) {
          handleNavigation(user, data.submission_status);
        } else {
          localStorage.removeItem('user');
          if (!isPublicPage) {
            if (navigationInProgress.current) return;
            navigationInProgress.current = true;
            navigate('/login?error=session_expired');
          }
        }
      } catch (error) {
        localStorage.removeItem('user');
        if (!isPublicPage) {
          if (navigationInProgress.current) return;
          navigationInProgress.current = true;
          navigate('/login?error=network_error');
        }
      }
    };

    checkAuthAndRedirect();
  }, [location.pathname]);

  return { handleNavigation };
};
