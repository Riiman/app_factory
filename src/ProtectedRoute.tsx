import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext.tsx';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // You can return a loading spinner here if you want
    return null;
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
