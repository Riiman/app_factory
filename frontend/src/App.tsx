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

const App: FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans antialiased">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <>
              <Header />
              <main><HomePage /></main>
              <Footer />
            </>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/submission" element={<SubmissionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pending-review" element={<PendingReviewPage />} />
            <Route path="/rejected-submission" element={<RejectedSubmissionPage />} />
          </Route>

          {/* Redirect any unknown paths to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;