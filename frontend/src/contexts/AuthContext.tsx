import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { User } from '../types/dashboard-types';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";

interface AuthContextType {
    user: User | null;
    submissionStatus: string | null;
    submissionData: any | null;
    nextQuestion: string | null;
    isLoading: boolean;
    handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
    const [submissionData, setSubmissionData] = useState<any | null>(null);
    const [nextQuestion, setNextQuestion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleLogout = useCallback(async () => {

        await signOut(auth);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setSubmissionStatus(null);
        setSubmissionData(null);
        setNextQuestion(null);
        window.location.href = '/login';
    }, []);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

            if (firebaseUser) {

                try {
                    const idToken = await firebaseUser.getIdToken();
                    const data = await api.post('/auth/login', { firebase_id_token: idToken });


                    if (data.success) {

                        localStorage.setItem('access_token', data.access_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setUser(data.user);
                        setSubmissionStatus(data.submission_status);
                        setSubmissionData(data.submission_data);
                        setNextQuestion(data.next_question);
                    } else {

                        handleLogout();
                    }
                } catch (error: any) {
                    console.error("AUTH: Error syncing with Flask backend:", error);
                    // If backend returns 403 (verification required) and we are on signup page,
                    // DO NOT log out. Let the user finish verification.
                    if (window.location.pathname === '/signup' && error.status === 403) {
                        console.log("AUTH: Ignoring 403 on signup page to allow verification.");
                    } else {
                        handleLogout();
                    }
                } finally {

                    setIsLoading(false);
                }
            } else {

                // We don't call handleLogout() here because that could cause a navigation loop.
                // We just clear the state. ProtectedRoute will handle navigation.
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                setUser(null);
                setSubmissionStatus(null);
                setSubmissionData(null);
                setNextQuestion(null);
                setIsLoading(false);
            }
        });

        return () => {

            unsubscribe();
        };
    }, [handleLogout]);

    const value = { user, submissionStatus, submissionData, nextQuestion, isLoading, handleLogout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};