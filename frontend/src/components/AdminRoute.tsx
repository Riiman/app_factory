import React, { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_verified: boolean;
  role: string; // "user" or "admin"
  created_at: string;
  startup_id: number | null;
}

const AdminRoute: FC = () => {
  const userString = localStorage.getItem('user');
  let user: User | null = null;

  if (userString) {
    try {
      user = JSON.parse(userString);
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    }
  }

  if (!user || user.role !== 'ADMIN') {
    // Redirect to login or a forbidden page if not an admin
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
