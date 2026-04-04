import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verifyEmail = async () => {
            try {
                await api.post('/auth/verify-email', { token });
                setStatus('success');
                setTimeout(() => navigate('/login'), 5000); // Redirect after 5s
            } catch (error: any) {
                setStatus('error');
                setMessage(error.response?.data?.error || 'Verification failed. The link may be expired.');
            }
        };

        verifyEmail();
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">

                    {status === 'verifying' && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying Email...</h2>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                            <p className="text-gray-600 mb-6">Your email has been successfully verified.</p>
                            <Link to="/login" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Continue to Login
                            </Link>
                            <p className="text-sm text-gray-400 mt-4">Redirecting in 5 seconds...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                            <p className="text-red-600 mb-6">{message}</p>
                            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default VerifyEmailPage;
