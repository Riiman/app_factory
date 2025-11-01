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
import StagePage from './pages/StagePage';
import EvaluationForm from './pages/EvaluationForm';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PlatformDashboard from './pages/PlatformDashboard';
import PlatformEvaluation from './pages/PlatformEvaluation';
import PlatformProductScope from './pages/PlatformProductScope';
import PlatformGtmScope from './pages/PlatformGtmScope';
import PlatformUxDesign from './pages/PlatformUxDesign';
import PlatformSprintBoard from './pages/PlatformSprintBoard';
import PlatformDeployment from './pages/PlatformDeployment';
import PlatformMultiStartupMonitor from './pages/PlatformMultiStartupMonitor';
import PlatformMonetization from './pages/PlatformMonetization';
import PlatformFundraising from './pages/PlatformFundraising';

// Public Pages
import Home from './pages/Home';
import NotFound from './pages/NotFound';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path={ROUTES.SIGNUP} element={<Signup />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
              <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />

              {/* Protected Routes - Each wrapped individually */}
              <Route 
                path={ROUTES.DASHBOARD} 
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
              />
              <Route 
                path={`${ROUTES.DASHBOARD}/stage/:stageKey`} 
                element={<ProtectedRoute><StagePage /></ProtectedRoute>} 
              />
              <Route 
                path={ROUTES.EVALUATION_FORM} 
                element={<ProtectedRoute><EvaluationForm /></ProtectedRoute>} 
              />
              <Route 
                path={ROUTES.DOCUMENTS} 
                element={<ProtectedRoute><Documents /></ProtectedRoute>} 
              />
              <Route 
                path={ROUTES.PROFILE} 
                element={<ProtectedRoute><Profile /></ProtectedRoute>} 
              />
              <Route 
                path={ROUTES.SETTINGS} 
                element={<ProtectedRoute><Settings /></ProtectedRoute>} 
              />
              <Route 
                path={ROUTES.SUBMISSIONS} 
                element={<ProtectedRoute><EvaluationForm /></ProtectedRoute>} 
              />

              {/* Platform Routes */}
              <Route 
                path="/platform/dashboard"
                element={<ProtectedRoute><PlatformDashboard /></ProtectedRoute>}
              />
              <Route 
                path="/platform/evaluation/:submissionId"
                element={<ProtectedRoute><PlatformEvaluation /></ProtectedRoute>}
              />
              <Route 
                path="/platform/scope/:startupId"
                element={<ProtectedRoute><PlatformProductScope /></ProtectedRoute>}
              />
              <Route 
                path="/platform/gtm-scope/:startupId"
                element={<ProtectedRoute><PlatformGtmScope /></ProtectedRoute>}
              />
              <Route 
                path="/platform/ux-design/:startupId"
                element={<ProtectedRoute><PlatformUxDesign /></ProtectedRoute>}
              />
              <Route 
                path="/platform/sprint-board/:startupId"
                element={<ProtectedRoute><PlatformSprintBoard /></ProtectedRoute>}
              />
              <Route 
                path="/platform/deployment/:startupId"
                element={<ProtectedRoute><PlatformDeployment /></ProtectedRoute>}
              />
              <Route 
                path="/platform/monitor"
                element={<ProtectedRoute><PlatformMultiStartupMonitor /></ProtectedRoute>}
              />
              <Route 
                path="/platform/monetization/:startupId"
                element={<ProtectedRoute><PlatformMonetization /></ProtectedRoute>}
              />
              <Route 
                path="/platform/fundraising/:startupId"
                element={<ProtectedRoute><PlatformFundraising /></ProtectedRoute>}
              />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
