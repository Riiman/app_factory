import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Icons (assuming lucide-react or similar for consistency)
// For now, using simple text or emojis as placeholders
const DashboardIcon = () => <span style={{ marginRight: '8px' }}>🏠</span>;
const TrendingUp = () => <span style={{ marginRight: '8px' }}>📈</span>;
const Assessment = () => <span style={{ marginRight: '8px' }}>📊</span>;
const AccountCircle = () => <span style={{ marginRight: '8px' }}>👤</span>;
const Settings = () => <span style={{ marginRight: '8px' }}>⚙️</span>;
const ExitToApp = () => <span style={{ marginRight: '8px' }}>🚪</span>;
const ChevronRight = () => <span style={{ marginLeft: 'auto' }}>▶️</span>;
const ExpandMore = () => <span style={{ marginLeft: 'auto' }}>🔽</span>;
const ScopeIcon = () => <span style={{ marginRight: '8px' }}>📋</span>; // Icon for Product Scope

  const Sidebar = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [openProduct, setOpenProduct] = useState(false); // State for Product submenu
  
    const handleProductClick = () => {
      setOpenProduct(!openProduct);
    };
  
    const isDashboardSelected = location.pathname === '/dashboard' && !location.search;
    const isProductScopeSelected = location.search === '?tab=product';
    const isUxUiSelected = location.search === '?tab=ux-design';
    const isGtmSelected = location.search === '?tab=gtm';
    const isFundingSelected = location.search === '?tab=funding';
    const isRevenueSelected = location.search === '?tab=revenue';
    const isProfileSelected = location.pathname === '/profile';
    const isSettingsSelected = location.pathname === '/settings';

    // Determine if any product sub-item is selected to keep parent open
    const isProductParentSelected = isProductScopeSelected || isUxUiSelected;
  
    const MenuItem = ({ icon, primary, onClick, children, isSelected }) => (
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 24px',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        {icon}
        <span style={{ flexGrow: 1 }}>{primary}</span>
        {children}
      </div>
    );
  
    const SubMenuItem = ({ primary, onClick, isSelected }) => (
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 24px 12px 40px',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <span style={{ flexGrow: 1 }}>{primary}</span>
      </div>
    );
  
    return (
      <div
        style={{
          width: '280px',
          height: '100vh',
          backgroundColor: '#1a2035',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            VentureX
          </h2>
        </div>
        <nav style={{ flexGrow: 1, paddingTop: 0 }}>
          <MenuItem 
            icon={<DashboardIcon />} 
            primary="Dashboard" 
            onClick={() => navigate('/dashboard')} 
            isSelected={isDashboardSelected} 
          />
          
          {/* Product Menu with Sub-items */}
          <MenuItem icon={<ScopeIcon />} primary="Product" onClick={handleProductClick} isSelected={isProductParentSelected}>
            {openProduct ? <ExpandMore /> : <ChevronRight />}
          </MenuItem>
          {openProduct && (
            <div style={{ paddingLeft: '0px' }}>
              <SubMenuItem primary="Product Scope" onClick={() => navigate('/dashboard?tab=product')} isSelected={isProductScopeSelected} />
              <SubMenuItem primary="UI/UX" onClick={() => navigate('/dashboard?tab=ux-design')} isSelected={isUxUiSelected} />
            </div>
          )}

          <MenuItem icon={<TrendingUp />} primary="GTM" onClick={() => navigate('/dashboard?tab=gtm')} isSelected={isGtmSelected} />
          <MenuItem icon={<Assessment />} primary="Funding" onClick={() => navigate('/dashboard?tab=funding')} isSelected={isFundingSelected} />
          <MenuItem icon={<AccountCircle />} primary="Revenue" onClick={() => navigate('/dashboard?tab=revenue')} isSelected={isRevenueSelected} />

          <MenuItem icon={<AccountCircle />} primary="Profile" onClick={() => navigate('/profile')} isSelected={isProfileSelected} />
          <MenuItem icon={<Settings />} primary="Settings" onClick={() => navigate('/settings')} isSelected={isSettingsSelected} />
        </nav>
        <div style={{ padding: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <MenuItem icon={<ExitToApp />} primary="Logout" onClick={onLogout} />
        </div>
      </div>
    );
  };
export default Sidebar;
