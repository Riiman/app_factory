import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService, { setAuthToken } from '../services/api.js';

interface AuthContextType {
    user: any;
    login: (token: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setAuthToken(token);
apiService.user.getProfile()
                .then(response => {
                    if (response.data.success) {
                        setUser(response.data.data);
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        setAuthToken(token);
        setLoading(true);
        apiService.user.getProfile()
            .then(response => {
                if (response.data.success) {
                    setUser(response.data.data);
                }
            })
            .finally(() => setLoading(false));
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuthToken(null);
        setUser(null);
    };

    const value = { user, login, logout, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
