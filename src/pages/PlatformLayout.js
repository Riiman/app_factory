import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar';
import { PanelLeftIcon } from 'lucide-react';

const PlatformLayout = () => {
  const location = useLocation();
  const [activeView, setActiveView] = useState(() => {
    const path = location.pathname.split('/');
    return path[path.length - 1] || 'dashboard';
  });

  const getPageTitle = () => {
    switch (activeView) {
      case 'submissions':
        return 'Submissions';
      case 'startups':
        return 'Startups';
      case 'metrics':
        return 'Metrics';
      case 'settings':
        return 'Settings';
      case 'cohort':
        return 'Cohort';
      case 'dashboard':
      default:
        return 'Dashboard';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AppSidebar activeItem={activeView} onNavigate={setActiveView} />
      <main style={{ flexGrow: 1, backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '56px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
          padding: '0 16px',
          backgroundImage: 'linear-gradient(to right, #e3f2fd, #ede7f6)',
        }}>
          <PanelLeftIcon size={20} style={{ color: '#616161' }} />
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e0e0e0' }} />
          <span style={{ fontSize: '0.875rem', color: '#757575' }}>VentureX / {getPageTitle()}</span>
        </header>
        <div style={{ flexGrow: 1, padding: '24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PlatformLayout;