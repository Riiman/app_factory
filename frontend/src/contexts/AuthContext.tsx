import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { User } from '../types/dashboard-types';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";

interface AuthContextType {
    user: User | null;
    submissionStatus: string | null;
    submissionData: any | null;
    startupStage: string | null;
    nextQuestion: string | null;
    isLoading: boolean;
    handleLogout: () => void;
    refreshUser: () => Promise<void>;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
    const [submissionData, setSubmissionData] = useState<any | null>(null);
    const [startupStage, setStartupStage] = useState<string | null>(null);
    const [nextQuestion, setNextQuestion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleLogout = useCallback(async () => {

        await signOut(auth);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setSubmissionStatus(null);
        setSubmissionData(null);
        setStartupStage(null);
        setNextQuestion(null);
        window.location.href = '/login';
    }, []);

    const fetchUserData = useCallback(async (firebaseUser: any) => {
        try {
            const idToken = await firebaseUser.getIdToken(true); // Force refresh token
            const data = await api.post('/auth/login', { firebase_id_token: idToken });

            if (data.success) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                setSubmissionStatus(data.submission_status);
                setSubmissionData(data.submission_data);
                setNextQuestion(data.next_question);

                if (data.user.startup_id) {
                    try {
                        const startupData = await api.getStartupData(data.user.startup_id);
                        setStartupStage(startupData.current_stage);
                    } catch (err) {
                        console.error("Failed to fetch startup stage:", err);
                    }
                }
            } else {
                handleLogout();
            }
        } catch (error: any) {
            console.error("AUTH: Error syncing with Flask backend:", error);
            if (window.location.pathname === '/signup' && error.status === 403) {
                console.log("AUTH: Ignoring 403 on signup page to allow verification.");
            } else {
                handleLogout();
            }
        } finally {
            setIsLoading(false);
        }
    }, [handleLogout]);

    const refreshUser = useCallback(async () => {
        if (auth.currentUser) {
            await fetchUserData(auth.currentUser);
        }
    }, [fetchUserData]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await fetchUserData(firebaseUser);
            } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                setUser(null);
                setSubmissionStatus(null);
                setSubmissionData(null);
                setStartupStage(null);
                setNextQuestion(null);
                setIsLoading(false);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [fetchUserData]);

    const token = localStorage.getItem('access_token');
    const value = { user, submissionStatus, submissionData, startupStage, nextQuestion, isLoading, handleLogout, refreshUser, token };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};