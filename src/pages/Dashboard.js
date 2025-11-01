import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import StageProgressBar from '../components/StageProgressBar';
import StageCard from '../components/StageCard';
import KpiCard from '../components/KpiCard';
import AlertPanel from '../components/AlertPanel';
import ActivityFeed from '../components/ActivityFeed';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.dashboard.getDashboard();
      
      console.log('Dashboard Response:', response.data);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        navigate('/evaluation-form');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.message);
      
      if (err.response?.status === 404) {
        navigate('/evaluation-form');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await logout();
      console.log("Logout succesful")
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>⚠️ Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
        <button onClick={handleLogout} style={{ marginTop: '8px' }}>
          Back to Login
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const {
    startup = {},
    stages = [],
    recent_activity = { tasks: [], artifacts: [] },
    integrations = [],
    alerts = []
  } = dashboardData;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>{startup.name || 'My Startup'}</h1>
          <p className="startup-status">Status: {startup.status || 'pending'}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/profile')}>
            Profile
          </button>
          <button className="btn-secondary" onClick={() => navigate('/settings')}>
            Settings
          </button>
          <button className="btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content-wrapper">
        {/* Progress Bar */}
        {stages.length > 0 && (
          <StageProgressBar 
            stages={stages} 
            currentStage={startup.current_stage_key || 'founder_specifications'}
            overallProgress={startup.overall_progress || 0}
          />
        )}

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <AlertPanel alerts={alerts} onDismiss={(id) => {/* Handle dismiss */}} />
        )}

        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={activeTab === 'overview' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'stages' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('stages')}
          >
            Stages
          </button>
          <button 
            className={activeTab === 'metrics' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
          <button 
            className={activeTab === 'integrations' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('integrations')}
          >
            Integrations
          </button>
        </div>

        {/* Tab Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <OverviewTab 
              startup={startup}
              stages={stages}
              recentActivity={recent_activity}
            />
          )}

          {activeTab === 'stages' && (
            <StagesTab 
              stages={stages}
              onStageClick={(stageKey) => navigate(`/dashboard/stage/${stageKey}`)}
            />
          )}

          {activeTab === 'metrics' && (
            <MetricsTab stages={stages} />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsTab 
              integrations={integrations}
              onConnect={(type) => {/* Handle integration */}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Tab components remain the same as before...
const OverviewTab = ({ startup, stages, recentActivity }) => {
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const inProgressStages = stages.filter(s => s.status === 'in_progress').length;
  const blockedStages = stages.filter(s => s.status === 'blocked').length;

  return (
    <div className="overview-tab">
      <div className="overview-stats">
        <KpiCard 
          metric={{
            name: 'Overall Progress',
            value: Math.round(startup.overall_progress || 0),
            unit: 'percentage'
          }}
        />
        <KpiCard 
          metric={{
            name: 'Stages Completed',
            value: completedStages,
            target: stages.length
          }}
        />
        <KpiCard 
          metric={{
            name: 'In Progress',
            value: inProgressStages
          }}
        />
        <KpiCard 
          metric={{
            name: 'Blocked',
            value: blockedStages
          }}
        />
      </div>

      <div className="overview-grid">
        <div className="current-stage-panel">
          <h2>Current Stage</h2>
          {stages.find(s => s.stage_key === startup.current_stage_key) ? (
            <StageCard 
              stage={stages.find(s => s.stage_key === startup.current_stage_key)}
              featured
            />
          ) : (
            <p>No active stage</p>
          )}
        </div>

        <div className="activity-panel">
          <h2>Recent Activity</h2>
          <ActivityFeed activity={recentActivity} />
        </div>
      </div>

      {inProgressStages > 0 && (
        <div className="next-steps">
          <h2>🎯 Next Steps</h2>
          <ul>
            {stages
              .filter(s => s.status === 'in_progress')
              .slice(0, 3)
              .map(stage => (
                <li key={stage.id}>
                  Complete <strong>{stage.name}</strong>
                  {stage.blockers && stage.blockers.length > 0 && (
                    <span className="blocker-indicator">⚠️ Blocked</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const StagesTab = ({ stages, onStageClick }) => {
  if (stages.length === 0) {
    return (
      <div className="empty-state">
        <p>No stages available. Please complete your evaluation form first.</p>
      </div>
    );
  }

  return (
    <div className="stages-tab">
      <div className="stages-grid">
        {stages.map(stage => (
          <StageCard 
            key={stage.id}
            stage={stage}
            onClick={() => onStageClick(stage.stage_key)}
          />
        ))}
      </div>
    </div>
  );
};

const MetricsTab = ({ stages }) => {
  const [selectedStage, setSelectedStage] = useState('all');
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    if (selectedStage === 'all') {
      const allMetrics = stages.flatMap(s => s.metrics || []);
      setMetrics(allMetrics);
    } else {
      const stage = stages.find(s => s.stage_key === selectedStage);
      setMetrics(stage?.metrics || []);
    }
  }, [selectedStage, stages]);

  return (
    <div className="metrics-tab">
      <div className="metrics-filter">
        <label>Filter by Stage:</label>
        <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
          <option value="all">All Stages</option>
          {stages.map(stage => (
            <option key={stage.id} value={stage.stage_key}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      <div className="metrics-grid">
        {metrics.map(metric => (
          <KpiCard 
            key={metric.id}
            metric={metric}
          />
        ))}
        
        {metrics.length === 0 && (
          <div className="empty-state">
            <p>No metrics available for this selection</p>
          </div>
        )}
      </div>
    </div>
  );
};

const IntegrationsTab = ({ integrations, onConnect }) => {
  const availableIntegrations = [
    { type: 'github', name: 'GitHub', icon: '🔗', description: 'Connect code repos' },
    { type: 'figma', name: 'Figma', icon: '🎨', description: 'Sync design files' },
    { type: 'ga4', name: 'Google Analytics', icon: '📊', description: 'Track analytics' },
    { type: 'stripe', name: 'Stripe', icon: '💳', description: 'Monitor revenue' },
  ];

  return (
    <div className="integrations-tab">
      {integrations.length > 0 && (
        <>
          <h2>✅ Connected Integrations</h2>
          <div className="integrations-grid">
            {integrations.map(integration => (
              <div key={integration.id} className="integration-card connected">
                <div className="integration-header">
                  <h3>{integration.type}</h3>
                  <span className={`status-badge ${integration.status}`}>
                    {integration.status}
                  </span>
                </div>
                <p>Last synced: {integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString() : 'Never'}</p>
                {integration.error_message && (
                  <p className="error">{integration.error_message}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2>🔌 Available Integrations</h2>
      <div className="integrations-grid">
        {availableIntegrations
          .filter(ai => !integrations.find(i => i.type === ai.type))
          .map(integration => (
            <div key={integration.type} className="integration-card available">
              <span className="integration-icon">{integration.icon}</span>
              <h3>{integration.name}</h3>
              <p>{integration.description}</p>
              <button 
                className="btn-primary"
                onClick={() => onConnect(integration.type)}
              >
                Connect
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;
