import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStageRedirect } from '../utils/useStageRedirect';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading, startupStage, submissionStatus } = useAuth();
  const { handleNavigation } = useStageRedirect();

  useEffect(() => {
    if (user && !isLoading) {
      handleNavigation(startupStage, submissionStatus);
    }
  }, [user, isLoading, startupStage, submissionStatus, handleNavigation]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {
    return <Outlet />;
  } else {
    return <Navigate to="/login" />;
  }
};

export default ProtectedRoute;
