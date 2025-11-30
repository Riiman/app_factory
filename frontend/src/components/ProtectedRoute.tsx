import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  

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
