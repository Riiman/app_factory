import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/layout/Footer';

const StartSubmissionPage = () => {
    const navigate = useNavigate();
    const { submissionStatus, isLoading: isAuthLoading, handleLogout, refreshUser } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    console.log('StartSubmissionPage Debug:', { submissionStatus, isAuthLoading, user: useAuth().user });

    useEffect(() => {
        // If the user has a draft, go to chat.
        if (!isAuthLoading && submissionStatus === 'DRAFT') {
            navigate('/submission');
        }
        // If pending, go to pending review.
        if (!isAuthLoading && submissionStatus === 'PENDING') {
            navigate('/pending-review');
        }
    }, [submissionStatus, isAuthLoading, navigate]);

    const handleStartSubmission = async () => {
        setIsCreating(true);
        setError('');
        try {
            await api.post('/submissions/start', {});
            // Use refreshUser to update context state without full reload
            await refreshUser();
        } catch (err: any) {
            setError(err.message || 'Failed to start a new submission. Please try again.');
            setIsCreating(false);
        }
    };

    // Show a loading state while we verify the user's submission status
    if (isAuthLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    // Only show the page content if the user truly has not started a submission or if status is null/missing (fallback)
    if (!submissionStatus || submissionStatus === 'not_started') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="relative flex items-center justify-center h-16">
                            {/* Centered Logo */}
                            <div className="flex items-center cursor-pointer">
                                <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500">
                                    VentureStack
                                </Link>
                            </div>

                            {/* Right-aligned Logout */}
                            <div className="absolute right-0 top-0 h-full flex items-center">
                                <button
                                    onClick={handleLogout}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-grow flex flex-col items-center justify-center p-4">
                    <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h1>
                        <p className="text-gray-600 mb-8">You're just one step away from starting your submission.</p>
                        <button
                            onClick={handleStartSubmission}
                            disabled={isCreating}
                            className="w-full px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:bg-brand-300 transition-all shadow-sm"
                        >
                            {isCreating ? 'Starting...' : 'Start Your Submission'}
                        </button>
                        {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // If the status is anything else (e.g. APPROVED, IN_REVIEW), the useAuthRedirect hook
    // will handle the navigation. We can return a loading state here as a fallback.
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
};

export default StartSubmissionPage;
