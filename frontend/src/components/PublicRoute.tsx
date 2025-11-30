import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute: React.FC = () => {
  const { user, isLoading, submissionStatus } = useAuth();
  

  if (isLoading) {
    
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {
    
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
    
    return <Navigate to={targetPath} />;
  } else {
    
    return <Outlet />;
  }
};

export default PublicRoute;
