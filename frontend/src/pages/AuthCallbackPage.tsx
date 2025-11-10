import React, { FC, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useStageRedirect } from '../utils/useStageRedirect';

const AuthCallbackPage: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleNavigation } = useStageRedirect();

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(location.search);
      const user = params.get('user');

      if (user) {
        localStorage.setItem('user', user);

        // Now, get the submission and startup status
        try {
          const response = await api.fetch('/auth/status');
          const data = await response.json();

          if (response.ok && data.success) {
            handleNavigation(data.startup_stage, data.submission_status);
          } else {
            navigate('/login?error=status_check_failed');
          }
        } catch (error) {
          navigate('/login?error=status_check_failed');
        }
      } else {
        navigate('/login?error=oauth_failed');
      }
    };

    handleAuth();
  }, [location, navigate, handleNavigation]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Finalizing authentication...</p>
    </div>
  );
};

export default AuthCallbackPage;