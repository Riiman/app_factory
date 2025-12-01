import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const StartSubmissionPage = () => {
    const navigate = useNavigate();
    const { submissionStatus, isLoading: isAuthLoading, handleLogout } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // This is the core logic: if the user has a pending submission,
        // they should not be on this page. Redirect them to the chat.
        if (!isAuthLoading && submissionStatus === 'PENDING') {
            navigate('/submission');
        }
    }, [submissionStatus, isAuthLoading, navigate]);

    const handleStartSubmission = async () => {
        setIsCreating(true);
        setError('');
        try {
            await api.post('/submissions/start', {});
            // Force a reload. The useAuth and useAuthRedirect hooks will now have the
            // updated "PENDING" status and redirect to the /submission page automatically.
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Failed to start a new submission. Please try again.');
            setIsCreating(false);
        }
    };

    // Show a loading state while we verify the user's submission status
    if (isAuthLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    // Only show the page content if the user truly has not started a submission
    if (submissionStatus === 'not_started') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 relative">
                <button
                    onClick={handleLogout}
                    className="absolute top-4 right-4 px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                    Logout
                </button>
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
                    <p className="mb-6">You're just one step away from starting your journey with us.</p>
                    <button
                        onClick={handleStartSubmission}
                        disabled={isCreating}
                        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {isCreating ? 'Starting...' : 'Start Your Submission'}
                    </button>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                </div>
            </div>
        );
    }

    // If the status is anything else (e.g. APPROVED, IN_REVIEW), the useAuthRedirect hook
    // will handle the navigation. We can return a loading state here as a fallback.
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
};

export default StartSubmissionPage;
