import React, { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface Organization {
  id: number;
  name: string;
  slug: string;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  is_verified: boolean;
  role: string; // "user" or "admin"
  created_at: string;
  startup_id: number | null;
  organization?: Organization;
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

  if (!user || user.role !== 'admin') {
    // Redirect to login or a forbidden page if not an admin
    return <Navigate to="/login" replace />;
  }

  // Enforce Organization Slug in URL
  // If we are at /admin (or subpaths) but not under /:orgSlug/admin, redirect.
  // We check if the current path starts with /admin (root admin path)
  // and if the user has an organization slug.
  const currentPath = window.location.pathname;
  if (user.organization?.slug && !currentPath.startsWith(`/${user.organization.slug}/admin`)) {
    // Preserves sub-paths if any, though usually /admin is the entry
    // If currentPath is just /admin, target is /:slug/admin
    // If currentPath is /admin/users, target is /:slug/admin/users
    // But wait, the route in App.tsx maps /admin/* directly. 
    // The /:orgSlug/admin/* route is also defined.

    // Correct logic: If we are hitting the global /admin route, we want to move to scoped.
    // Simple check: does path start with /admin?
    if (currentPath.startsWith('/admin')) {
      const newPath = currentPath.replace('/admin', `/${user.organization.slug}/admin`);
      return <Navigate to={newPath} replace />;
    }
  }

  return <Outlet />;
};

export default AdminRoute;
