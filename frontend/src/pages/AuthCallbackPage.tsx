import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('access_token', token);
            // We don't have the user object here, but the useAuth hook will fetch it.
            navigate('/'); // Use navigate to stay within SPA
        } else {
            // Handle error, maybe redirect to login with an error message
            navigate('/login?error=oauth_failed');
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex justify-center items-center h-screen">
            <div>Loading, please wait...</div>
        </div>
    );
};

export default AuthCallbackPage;
