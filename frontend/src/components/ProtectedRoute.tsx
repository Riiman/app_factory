import React, { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStageRedirect } from '../utils/useStageRedirect';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading, startupStage, submissionStatus } = useAuth();
  const { handleNavigation } = useStageRedirect();
  const { orgSlug } = useParams<{ orgSlug: string }>();

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
    return <Navigate to={orgSlug ? `/${orgSlug}/login` : "/login"} />;
  }
};

export default ProtectedRoute;
