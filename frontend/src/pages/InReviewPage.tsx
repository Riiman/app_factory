import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const InReviewPage = () => {
    const { handleLogout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                <div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Submission Under Review
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Your application has been received and is currently being reviewed by our team.
                    </p>
                </div>

                <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                </div>

                <p className="text-gray-500">
                    We will notify you once the review process is complete. This usually takes 24-48 hours.
                </p>

                <div className="mt-6">
                    <button
                        onClick={handleLogout}
                        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InReviewPage;
