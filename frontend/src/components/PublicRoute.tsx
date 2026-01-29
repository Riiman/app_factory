import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute: React.FC = () => {
  const { user, isLoading, submissionStatus, startupSlug } = useAuth();
  const { orgSlug } = useParams<{ orgSlug: string }>();


  if (isLoading) {

    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {

    let targetPath: string;
    if (user.role === 'admin') {
      targetPath = '/admin';
      // Admin might not be bound to one org, so maybe no prefix?
      // Or if checking an org, /orgSlug/admin? Assuming global admin for now.
    } else {
      switch (submissionStatus?.toLowerCase()) {
        case 'not_started':
          targetPath = '/start-submission';
          break;
        case 'pending':
          targetPath = '/submission'; // Note: PENDING often maps to In Review if submitted
          // Fix alignment with useStageRedirect? PENDING -> /in-review usually?
          // Keeping logic similar to original for safety, but check mapping.
          // Original had /submission
          break;
        case 'in_review':
          targetPath = '/in-review'; // Fixed path name from pending-review to match App.tsx routes
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

      // Determine prefix
      const prefix = orgSlug ? `/${orgSlug}` : (startupSlug ? `/${startupSlug}` : '');
      targetPath = `${prefix}${targetPath}`;
    }

    return <Navigate to={targetPath} />;
  } else {

    return <Outlet />;
  }
};

export default PublicRoute;
