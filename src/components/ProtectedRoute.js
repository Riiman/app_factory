import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';  // Use context instead
import { ROUTES } from '../config/constants';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { user, loading, authReady } = useAuth();  // Get loading state
  
  // Show loading while checking auth
  if (loading) {
    return LoadingSpinner
  }
  
  // Redirect if not authenticated
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  return children;
};

export default ProtectedRoute;
