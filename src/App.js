import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTES } from './config/constants';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
// import SubmissionForm from '../deleted files/frontend/pages/Delete_SubmissionForm';
import EvaluationForm from './pages/EvaluationForm';
import Documents from './pages/Documents';
import Profile from './pages/Profile';

// Public Pages
import Home from './pages/Home';
import NotFound from './pages/NotFound';

import './App.css';

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path={ROUTES.SIGNUP} element={<Signup />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
              <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />

              {/* Protected Routes */}
              <Route
                path={ROUTES.DASHBOARD}
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.SUBMISSIONS}
                element={
                  <ProtectedRoute>
                    <EvaluationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.DOCUMENTS}
                element={
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.PROFILE}
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to home */}
              <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;