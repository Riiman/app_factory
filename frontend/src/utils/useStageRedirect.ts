import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const useStageRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = useCallback((startupStage: string | null, submissionStatus: string | null) => {
        let targetPath = '/dashboard';

        if (startupStage) {
            switch (startupStage.toUpperCase()) {
                case 'EVALUATION':
                    targetPath = '/evaluation';
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

        // Prevent infinite loops and allow sub-routes for dashboard
        if (targetPath === '/dashboard') {
            if (!location.pathname.startsWith('/dashboard') && location.pathname !== '/') {
                // Allow access to dashboard sub-routes, but redirect if on a restricted page like /evaluation
                // when they should be on dashboard.
                // However, we must be careful not to redirect away from valid dashboard sub-routes.
                // If the user is on /evaluation but target is /dashboard, we SHOULD redirect.
                const restrictedPaths = ['/evaluation', '/scope', '/contract', '/pending-review', '/rejected-submission', '/submission'];
                if (restrictedPaths.includes(location.pathname)) {
                    navigate('/dashboard');
                }
            }
        } else {
            if (location.pathname !== targetPath) {
                navigate(targetPath);
            }
        }

    }, [navigate, location]);

    return { handleNavigation };
};
