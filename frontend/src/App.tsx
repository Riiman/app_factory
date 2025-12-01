import React, { FC, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SubmissionPage from './pages/SubmissionPage';
import PendingReviewPage from './pages/PendingReviewPage';
import RejectedSubmissionPage from './pages/RejectedSubmissionPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute'; // Import PublicRoute
import AdminRoute from './components/AdminRoute';
import StartSubmissionPage from './pages/StartSubmissionPage';
import EvaluationPage from './pages/EvaluationPage';
import ScopePage from './pages/ScopePage';
import ContractPage from './pages/ContractPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppRoutes: FC = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Establish WebSocket connection for dashboard notifications
    const ws = new WebSocket("ws://localhost:8000/ws/dashboard-notifications");

    ws.onopen = () => {
      console.log("Connected to dashboard notifications WebSocket.");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'dashboard_update') {
          console.log("Received dashboard update, invalidating startupData query:", message);
          // This tells React Query to refetch the data for the dashboard
          queryClient.invalidateQueries({ queryKey: ['startupData'] });
          queryClient.invalidateQueries({ queryKey: ['adminData'] });
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from dashboard notifications WebSocket.");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Cleanup function: Close WebSocket connection when component unmounts
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [queryClient]); // Add queryClient to the dependency array

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <>
          <Header />
          <main><HomePage /></main>
          <Footer />
        </>
      } />

      {/* Routes for logged-out users only */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/signup" element={<SignupPage />} />

      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected Routes (User) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/start-submission" element={<StartSubmissionPage />} />
        <Route path="/submission" element={<SubmissionPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pending-review" element={<PendingReviewPage />} />
        <Route path="/rejected-submission" element={<RejectedSubmissionPage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
        <Route path="/scope" element={<ScopePage />} />
        <Route path="/contract" element={<ContractPage />} />
      </Route>

      {/* Protected Routes (Admin) */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/*" element={<AdminDashboardPage />} />
      </Route>

      {/* Redirect any unknown paths to home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 font-sans antialiased">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
