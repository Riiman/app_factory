import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export const useStageRedirect = () => {
  const navigate = useNavigate();

  const handleNavigation = useCallback((startupStage: string | null, submissionStatus: string | null) => {
    if (startupStage) {
        switch (startupStage.toUpperCase()) {
            case 'EVALUATION':
                navigate('/evaluation');
                break;
            case 'SCOPE':
                navigate('/scope');
                break;
            case 'CONTRACT':
                navigate('/contract');
                break;
            case 'ADMITTED':
                navigate('/dashboard');
                break;
            default:
                // Fallback for other startup stages or if logic needs expansion
                navigate('/dashboard');
                break;
        }
    } else {
        // Fallback to submission status if startup stage is not available
        switch (submissionStatus?.toUpperCase()) {
            case 'APPROVED':
                // This case might lead to the dashboard if the startup object is created right after approval
                navigate('/dashboard');
                break;
            case 'PENDING':
            case 'IN_REVIEW':
                navigate('/pending-review');
                break;
            case 'REJECTED':
                navigate('/rejected-submission');
                break;
            default:
                // Default fallback if no status matches
                navigate('/submission');
                break;
        }
    }
  }, [navigate]);

  return { handleNavigation };
};
