import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserLogin from './UserLogin';
import UserRegistration from './UserRegistration';
import Dashboard from './Dashboard';
import DashboardHome from './DashboardHome';
import ProfileManagement from './ProfileManagement';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<UserRegistration />} />
          <Route path="/dashboard" element={
            <Dashboard>
              <DashboardHome />
            </Dashboard>
          } />
          <Route path="/profile" element={<ProfileManagement />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </div>
    </Router>
  );
}

export default App;
