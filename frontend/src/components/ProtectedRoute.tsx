import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  console.log(`PROTECTED_ROUTE: Rendering. isLoading: ${isLoading}, user:`, user);

  if (isLoading) {
    console.log("PROTECTED_ROUTE: isLoading is true, showing loading screen.");
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {
    console.log("PROTECTED_ROUTE: User is authenticated, rendering Outlet.");
    return <Outlet />;
  } else {
    console.log("PROTECTED_ROUTE: No user, redirecting to /login.");
    return <Navigate to="/login" />;
  }
};

export default ProtectedRoute;
