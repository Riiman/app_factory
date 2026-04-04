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
    startupSlug: string | null; // Added startupSlug
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
    const [startupSlug, setStartupSlug] = useState<string | null>(null); // State for startupSlug
    const [nextQuestion, setNextQuestion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Firebase signOut failed:", error);
        }

        try {
            // Optional: Call backend logout if you want to notify the server
            // await api.logout(); 
        } catch (error) {
            console.error("Backend logout failed:", error);
        } finally {
            // Always clear local state
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);
            setSubmissionStatus(null);
            setSubmissionData(null);
            setStartupStage(null);
            setStartupSlug(null); // Clear startupSlug
            setNextQuestion(null);
            window.location.href = '/login';
        }
    }, []);

    const fetchUserData = useCallback(async (firebaseUser: any) => {
        try {
            const idToken = await firebaseUser.getIdToken(); // Remove force refresh to prevent throttling
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
                        setStartupSlug(startupData.slug); // Set startupSlug
                    } catch (err) {
                        console.error("Failed to fetch startup stage:", err);
                    }
                }
            } else if (data.requires_signup || data.requires_organization) {
                console.log("AUTH: Login/Signup flow in progress (requires_signup/org), skipping auto-logout.");
            } else {
                handleLogout();
            }
        } catch (error: any) {
            console.error("AUTH: Error syncing with Flask backend:", error);
            handleLogout();
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
                // Prevent auto-sync on signup page to avoid race condition with organization signup
                if (window.location.pathname === '/signup' || window.location.pathname === '/login') {
                    console.log("AUTH: Skipping auto-sync on signup/login page.");
                    setIsLoading(false);
                    return;
                }
                await fetchUserData(firebaseUser);
            } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                setUser(null);
                setSubmissionStatus(null);
                setSubmissionData(null);
                setStartupStage(null);
                setStartupSlug(null); // Clear startupSlug
                setNextQuestion(null);
                setIsLoading(false);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [fetchUserData]);

    const token = localStorage.getItem('access_token');
    const value = { user, submissionStatus, submissionData, startupStage, startupSlug, nextQuestion, isLoading, handleLogout, refreshUser, token };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};