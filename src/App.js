import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import PendingReviewPage from './pages/PendingReview';
import PlatformSubmissions from './pages/PlatformSubmissions';
import PlatformStartups from './pages/PlatformStartups';
import PlatformMetrics from './pages/PlatformMetrics';
import PlatformSettings from './pages/PlatformSettings';
import PlatformCohort from './pages/PlatformCohort';
import PlatformLayout from './pages/PlatformLayout';

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
              <Route 
                path="/pending-review"
                element={<ProtectedRoute><PendingReviewPage /></ProtectedRoute>}
              />

              {/* Platform Routes */}
              <Route 
                path="/platform"
                element={<ProtectedRoute roles={['admin']}><PlatformLayout /></ProtectedRoute>}
              >
                <Route path="dashboard" element={<PlatformDashboard />} />
                <Route path="evaluation/:submissionId" element={<PlatformEvaluation />} />
                <Route path="scope/:startupId" element={<PlatformProductScope />} />
                <Route path="gtm-scope/:startupId" element={<PlatformGtmScope />} />
                <Route path="ux-design/:startupId" element={<PlatformUxDesign />} />
                <Route path="sprint-board/:startupId" element={<PlatformSprintBoard />} />
                <Route path="deployment/:startupId" element={<PlatformDeployment />} />
                <Route path="monitor" element={<PlatformMultiStartupMonitor />} />
                <Route path="monetization/:startupId" element={<PlatformMonetization />} />
                <Route path="fundraising/:startupId" element={<PlatformFundraising />} />
                <Route path="submissions" element={<PlatformSubmissions />} />
                <Route path="startups" element={<PlatformStartups />} />
                <Route path="metrics" element={<PlatformMetrics />} />
                <Route path="settings" element={<PlatformSettings />} />
                <Route path="cohort" element={<PlatformCohort />} />
              </Route>

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
