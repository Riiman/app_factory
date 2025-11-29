import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute: React.FC = () => {
  const { user, isLoading, submissionStatus } = useAuth();
  console.log(`PUBLIC_ROUTE: Rendering. isLoading: ${isLoading}, user:`, user);

  if (isLoading) {
    console.log("PUBLIC_ROUTE: isLoading is true, showing loading screen.");
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {
    console.log("PUBLIC_ROUTE: User is authenticated. Determining redirect path.");
    let targetPath: string;
    if (user.role === 'ADMIN') {
        targetPath = '/admin';
    } else {
        switch (submissionStatus?.toLowerCase()) {
            case 'not_started':
                targetPath = '/start-submission';
                break;
            case 'pending':
                targetPath = '/submission';
                break;
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
                targetPath = '/start-submission';
                break;
        }
    }
    console.log(`PUBLIC_ROUTE: Redirecting to ${targetPath}.`);
    return <Navigate to={targetPath} />;
  } else {
    console.log("PUBLIC_ROUTE: No user, rendering Outlet (e.g., Login/Signup page).");
    return <Outlet />;
  }
};

export default PublicRoute;
