import React, { FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      
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
