import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useStageRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const { startupSlug } = useAuth();

    const handleNavigation = useCallback((startupStage: string | null, submissionStatus: string | null) => {
        let targetPath = '/dashboard';

        if (startupStage) {
            switch (startupStage.toUpperCase()) {
                case 'EVALUATION':
                    targetPath = '/in-review';
                    break;
                case 'SCOPING':
                    targetPath = '/scope';
                    break;
                case 'CONTRACT':
                    targetPath = '/contract';
                    break;
                case 'ADMITTED':
                    targetPath = '/dashboard';
                    break;
                case 'IDEA':
                case 'MVP':
                case 'GROWTH':
                    targetPath = '/dashboard';
                    break;
                default:
                    targetPath = '/dashboard';
                    break;
            }
        } else {
            // Fallback to submission status if startup stage is not available
            switch (submissionStatus?.toUpperCase()) {
                case 'APPROVED':
                    // This case might lead to the dashboard if the startup object is created right after approval
                    targetPath = '/dashboard';
                    break;
                case 'DRAFT':
                    targetPath = '/submission';
                    break;
                case 'FINALIZE_SUBMISSION':
                    targetPath = '/finalize-submission';
                    break;
                case 'IN_REVIEW':
                    targetPath = '/in-review';
                    break;
                case 'PENDING':
                    // PENDING now means "Submitted but not yet picked up by admin", so show "Under Review" page
                    targetPath = '/in-review';
                    break;
                case 'REJECTED':
                    targetPath = '/rejected-submission';
                    break;
                case 'NOT_STARTED':
                    targetPath = '/start-submission';
                    break;
                default:
                    // Default fallback if no status matches
                    targetPath = '/start-submission';
                    break;
            }
        }

        // Determine prefix: use URL param if available, otherwise fallback to auth slug
        const prefix = orgSlug ? `/${orgSlug}` : (startupSlug ? `/${startupSlug}` : '');
        const fullTargetPath = `${prefix}${targetPath}`;

        // Helper to check if current path matches target, ignoring trailing slashes
        const currentPath = location.pathname.endsWith('/') ? location.pathname.slice(0, -1) : location.pathname;
        const target = fullTargetPath.endsWith('/') ? fullTargetPath.slice(0, -1) : fullTargetPath;

        // Prevent infinite loops and allow sub-routes for dashboard
        if (targetPath === '/dashboard') {
            // Check if we are already under the dashboard subtree of the correct org
            const isInDashboardSubtree = currentPath.startsWith(`${prefix}/dashboard`) || (prefix === '' && currentPath.startsWith('/dashboard'));

            if (isInDashboardSubtree) {
                // We are in the dashboard area. 
                // However, if we are on a "restricted" page (like /evaluation) but state says we should be on dashboard, we might redirect.
                // But wait, restricted paths logic was to handle moving OUT of restricted areas.
                // If targetPath is /dashboard, it implies we are FULLY active.

                // Let's re-evaluate the "restrictedPaths" logic with prefixes.
                // Restricted paths are the ones we redirected TO in other cases.
                const restrictedSuffixes = ['/evaluation', '/scope', '/contract', '/pending-review', '/rejected-submission', '/submission', '/start-submission'];

                // If current path ends with one of these, but we are supposed to be on dashboard, redirect.
                const isOnRestrictedPage = restrictedSuffixes.some(suffix => currentPath.endsWith(suffix));

                if (isOnRestrictedPage) {
                    navigate(fullTargetPath);
                }
                // Otherwise, stay where we are (e.g. /dashboard/products)
            } else {
                // Not in dashboard subtree at all, redirect to root dashboard
                if (currentPath !== target) {
                    navigate(fullTargetPath);
                }
            }
        } else {
            // For non-dashboard targets (exact matches usually)
            if (currentPath !== target) {
                navigate(fullTargetPath);
            }
        }

    }, [navigate, location, orgSlug, startupSlug]);

    return { handleNavigation };
};
