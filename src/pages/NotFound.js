
import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to={ROUTES.HOME} className="home-btn">
            Go to Home
          </Link>
          <Link to={ROUTES.DASHBOARD} className="dashboard-btn">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
