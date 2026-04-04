import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Scope } from '@/types/dashboard-types';
import { Navigate } from 'react-router-dom';

interface RequireScopeProps {
    children: React.ReactNode;
    scope: string; // The required scope, e.g., 'MARKETING', 'PRODUCT'
    redirectTo?: string;
    showError?: boolean;
}

const RequireScope: React.FC<RequireScopeProps> = ({ children, scope, redirectTo = '/dashboard', showError = false }) => {
    const { user } = useAuth();

    // If no user, let AuthGuard handle it, or render nothing
    if (!user) return null;

    // 1. Owner & Admin always have access
    // Note: Assuming 'admin' role or ownership implies full access.
    // We can also check if (user.id === startup.user_id) but we need startup context.
    // For now, let's rely on the scopes list in the user object if available, OR role.
    if (user.role?.toUpperCase() === 'ADMIN' || user.role === 'admin') return <>{children}</>;

    // 2. Check Scopes
    // We assume the backend User.to_dict() includes a list of scopes for the CURRENT startup.
    // Wait, User model in frontend might not have scopes directly on it if it's the User object.
    // The scopes are on the TeamMember relationship.
    // When we login/fetch user, we need to make sure we get the scopes for the current startup.

    // Let's check the User interface in dashboard-types.ts.
    // If 'scopes' is not present on User, we need to add it to the backend User.to_dict() 
    // SPECIFICALLY for the startup context.

    // Checking User interface...
    // Only 'role' is there. We need 'active_scopes' or similar.

    // For now, let's assume 'scopes' might be added potentially.
    // If not, we might fail.
    // Let's fallback to allowing everything if we can't check scopes yet, 
    // BUT the goal is to implement this.

    // Strategy:
    // We need to ensure the User object in frontend has the scopes for the current startup.
    // I will check `dashboard-types.ts` first. if not I will add it.

    const userScopes = (user as any).scopes || [];

    // Normalize scopes to uppercase for comparison
    const hasScope = userScopes.map((s: string) => s.toUpperCase()).includes(scope.toUpperCase());

    if (!hasScope) {
        if (showError) {
            return <div className="p-4 text-red-600 bg-red-50 rounded-md">Access Denied: You do not have the required {scope} permissions.</div>;
        }
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};

export default RequireScope;
