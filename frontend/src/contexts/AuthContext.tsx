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

    const handleLogout = useCallback(() => {
        console.log("AUTH: handleLogout called.");
        signOut(auth);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setSubmissionStatus(null);
        setSubmissionData(null);
        setNextQuestion(null);
    }, []);

    useEffect(() => {
        console.log("AUTH: onAuthStateChanged listener SETUP.");
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("AUTH: onAuthStateChanged event FIRED. Firebase user:", firebaseUser);
            if (firebaseUser) {
                console.log("AUTH: Firebase user found. Attempting to sync with Flask backend.");
                try {
                    const idToken = await firebaseUser.getIdToken();
                    const data = await api.post('/auth/login', { firebase_id_token: idToken });
                    console.log("AUTH: Backend response received:", data);
                    
                    if (data.success) {
                        console.log("AUTH: Backend login successful. Setting AuthContext state.");
                        localStorage.setItem('access_token', data.access_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setUser(data.user);
                        setSubmissionStatus(data.submission_status);
                        setSubmissionData(data.submission_data);
                        setNextQuestion(data.next_question);
                    } else {
                        console.log("AUTH: Backend login failed (data.success is false). Calling handleLogout.");
                        handleLogout();
                    }
                } catch (error) {
                    console.error("AUTH: Error syncing with Flask backend:", error);
                    handleLogout();
                } finally {
                    console.log("AUTH: Finished auth check. Setting isLoading to false.");
                    setIsLoading(false);
                }
            } else {
                console.log("AUTH: No Firebase user. Clearing state and setting isLoading to false.");
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
            console.log("AUTH: Cleaning up onAuthStateChanged listener.");
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