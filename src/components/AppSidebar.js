import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Rocket,
  BarChart3,
  Settings,
  LogOut,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    id: 'dashboard',
    path: '/platform/dashboard',
  },
  {
    title: 'Submissions',
    icon: FileText,
    id: 'submissions',
    path: '/platform/submissions',
  },
  {
    title: 'Startups',
    icon: Rocket,
    id: 'startups',
    path: '/platform/startups',
  },
  {
    title: 'Metrics',
    icon: BarChart3,
    id: 'metrics',
    path: '/platform/metrics',
  },
  {
    title: 'Cohort',
    icon: Users,
    id: 'cohort',
    path: '/platform/cohort',
  },
  {
    title: 'Settings',
    icon: Settings,
    id: 'settings',
    path: '/platform/settings',
  },
];

export function AppSidebar({ activeItem, onNavigate }) {
  const navigate = useNavigate();

  const handleNavigation = (path, id) => {
    navigate(path);
    onNavigate(id);
  };

  const handleLogout = () => {
    // authService.logout(); // Assuming authService exists and handles logout
    navigate('/login');
  };

  return (
    <div style={{
      width: '280px',
      flexShrink: 0,
      height: '100vh',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8f8f8',
    }}>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(45deg, #1976D2 30%, #673AB7 90%)',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.2)',
          }}>
            <Rocket size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>VentureX</span>
            <span style={{ fontSize: '0.75rem' }}>Platform</span>
          </div>
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: '8px', margin: 0, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <li key={item.id} style={{ marginBottom: '8px' }}>
            <button
              onClick={() => handleNavigation(item.path, item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: activeItem === item.id ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                color: activeItem === item.id ? '#2196F3' : '#333',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s, color 0.2s',
              }}
            >
              <item.icon size={20} />
              <span>{item.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#333',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.2s, color 0.2s',
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
