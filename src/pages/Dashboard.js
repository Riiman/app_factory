import React, { useState, useEffect, useCallback } from 'react';
import ProductScopeView from '../components/ProductScopeView';
import { useAuth } from '../context/AuthContext';
import StageProgressBar from '../components/StageProgressBar';
import UxDesignView from '../components/UxDesignView';
import ShareMonitorView from '../components/ShareMonitorView';
import FundraisingHandoverView from '../components/FundraisingHandoverView';
import GtmScopeView from '../components/GtmScopeView';
import MonetizeGtmView from '../components/MonetizeGtmView';
import BuildProgressView from '../components/BuildProgressView';
import apiService from '../services/api';
import { useNavigate } from 'react-router-dom';
import TestDeployView from '../components/TestDeployView';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/platform/dashboard');
    }
  }, [user, navigate]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.dashboard.getDashboard();

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        navigate('/evaluation-form');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err);

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
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            border: '5px solid #fff',
            borderBottomColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px',
          }}
        ></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ color: 'white', fontWeight: 600, fontSize: '1.5rem' }}>
          Loading your dashboard...
        </h2>
      </div>
    );
  }

  if (error) {
    if (error.response && error.response.status === 404) {
      return (
        <div style={{ maxWidth: '800px', margin: '64px auto', padding: '32px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
          <h3 style={{ color: '#F44336', fontWeight: 700, marginBottom: '16px' }}>
            ⚠️ Data Not Found
          </h3>
          <p style={{ color: '#757575', marginBottom: '24px' }}>
            The requested data is not yet available, or you do not have permission to view it.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={fetchDashboardData}
              style={{
                backgroundColor: '#1976D2',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'transparent',
                color: '#1976D2',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #1976D2',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: '800px', margin: '64px auto', padding: '32px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
        <h3 style={{ color: '#F44336', fontWeight: 700, marginBottom: '16px' }}>
          ⚠️ Error Loading Dashboard
        </h3>
        <p style={{ color: '#757575', marginBottom: '24px' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={fetchDashboardData}
            style={{
              backgroundColor: '#1976D2',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Retry
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'transparent',
              color: '#1976D2',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #1976D2',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  if (dashboardData.submission?.status === 'pending') {
    navigate('/pending-review');
    return null;
  }

  const {
    startup = {},
    stages = [],
    recent_activity = { tasks: [], artifacts: [] },
    integrations = [],
    alerts = []
  } = dashboardData;

  const EvaluationTab = ({ submission }) => {
    if (!submission || submission.status !== 'reviewed') {
      return (
        <div style={{ padding: '16px' }}>
          <p>Your submission has not been reviewed yet.</p>
        </div>
      );
    }

    const actionTasks = JSON.parse(submission.action_tasks || '[]');

    return (
      <div style={{ padding: '16px' }}>
        <h4 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Evaluation Feedback</h4>
        
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Evaluation Summary</h5>
          <p>{submission.evaluation_summary}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Platform Feedback</h5>
          <p>{submission.platform_feedback}</p>
        </div>

        {actionTasks.length > 0 && (
          <div>
            <h5 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Action Tasks</h5>
            <ul>
              {actionTasks.map((task, index) => (
                <li key={index}><p>{task}</p></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const OverviewTab = ({ startup, stages, recentActivity }) => {
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const inProgressStages = stages.filter(s => s.status === 'in_progress').length;
    const blockedStages = stages.filter(s => s.status === 'blocked').length;

    const getStatusBadge = (status) => {
      let backgroundColor = '#e0e0e0'; // default grey
      let color = '#333';
      if (status === 'active') {
        backgroundColor = '#e8f5e9'; // success light green
        color = '#388e3c'; // success green
      } else if (status === 'pending') {
        backgroundColor = '#fff3e0'; // warning light orange
        color = '#f57c00'; // warning orange
      } else if (status === 'completed') {
        backgroundColor = '#e3f2fd'; // info light blue
        color = '#1976d2'; // info blue
      }
      return (
        <span
          style={{
            backgroundColor,
            color,
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
          }}
        >
          {status}
        </span>
      );
    };

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>Overall Progress</h4>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1976D2' }}>
              {Math.round(startup.overall_progress || 0)}%
            </h3>
            <div style={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              marginTop: '8px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${startup.overall_progress || 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '4px',
              }}></div>
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>Stages Completed</h4>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#388e3c' }}>
              {completedStages}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#757575' }}>
              of {stages.length} total
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>In Progress</h4>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f57c00' }}>
              {inProgressStages}
            </h3>
          </div>
          <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>Blocked</h4>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#F44336' }}>
              {blockedStages}
            </h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Current Status</h4>
            {startup.status ? (
              <div style={{ padding: '16px' }}>
                <h5 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                  {startup.status.replace('_', ' ').toUpperCase()}
                </h5>
                {getStatusBadge(startup.status)}
              </div>
            ) : (
              <p>No status available</p>
            )}
          </div>

          <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Recent Activity</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {recentActivity.tasks && recentActivity.tasks.length > 0 ? (
                <div>
                  {recentActivity.tasks.slice(0, 5).map((task, index) => (
                    <div key={index} style={{ paddingBottom: '16px', borderBottom: index < recentActivity.tasks.length - 1 ? '1px solid #eeeeee' : 'none' }}>
                      <p style={{ fontWeight: 600 }}>{task.title}</p>
                      <span style={{ fontSize: '0.75rem', color: '#757575' }}>
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#757575' }}>No recent tasks</p>
              )}
            </div>
          </div>
        </div>

        {inProgressStages > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>🎯 Next Steps</h4>
            <div style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
              <ul>
                {stages
                  .filter(s => s.status === 'in_progress')
                  .slice(0, 3)
                  .map(stage => (
                    <li key={stage.id}>
                      <p style={{ display: 'inline' }}>
                        Complete <strong style={{ fontWeight: 700 }}>{stage.name}</strong>
                        {stage.blockers && stage.blockers.length > 0 && (
                          <span style={{ color: '#F44336', marginLeft: '8px' }}>⚠️ Blocked</span>
                        )}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
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
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Filter by Stage:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button 
              style={{
                padding: '8px 16px',
                borderRadius: '5px',
                border: selectedStage === 'all' ? 'none' : '1px solid #ccc',
                backgroundColor: selectedStage === 'all' ? '#1976D2' : '#f0f0f0',
                color: selectedStage === 'all' ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
              onClick={() => setSelectedStage('all')}
            >
              All Stages
            </button>
            {stages.map(stage => (
              <button 
                key={stage.id} 
                style={{
                  padding: '8px 16px',
                  borderRadius: '5px',
                  border: selectedStage === stage.stage_key ? 'none' : '1px solid #ccc',
                  backgroundColor: selectedStage === stage.stage_key ? '#1976D2' : '#f0f0f0',
                  color: selectedStage === stage.stage_key ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                onClick={() => setSelectedStage(stage.stage_key)}
              >
                {stage.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {metrics.map(metric => (
            <div key={metric.id} style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>{metric.name}</h4>
              <h3 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1976D2', marginBottom: '8px' }}>
                {metric.value}{metric.unit}
              </h3>
              {metric.target && (
                <p style={{ fontSize: '0.875rem', color: '#757575' }}>
                  Target: {metric.target}{metric.unit}
                </p>
              )}
              <div style={{
                marginTop: '8px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${metric.progress || 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '3px',
                }}></div>
              </div>
            </div>
          ))}
          
          {metrics.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p>No metrics available for this selection</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Placeholder for Funding Tab
  const FundingTab = () => (
    <div style={{ padding: '16px', color: '#757575' }}>Funding information will be displayed here.</div>
  );

  // Placeholder for Revenue Tab
  const RevenueTab = () => (
    <div style={{ padding: '16px', color: '#757575' }}>Revenue information will be displayed here.</div>
  );

  const IntegrationsTab = ({ integrations, onConnect }) => {
    const availableIntegrations = [
      { type: 'github', name: 'GitHub', icon: '🔗', description: 'Connect code repos' },
      { type: 'figma', name: 'Figma', icon: '🎨', description: 'Sync design files' },
      { type: 'ga4', name: 'Google Analytics', icon: '📊', description: 'Track analytics' },
      { type: 'stripe', name: 'Stripe', icon: '💳', description: 'Monitor revenue' },
    ];

    return (
      <div>
        {integrations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>✅ Connected Integrations</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {integrations.map(integration => (
                <div key={integration.id} style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
                  <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>{integration.type}</h5>
                  <p style={{ fontSize: '0.875rem', color: '#757575', marginBottom: '8px' }}>{integration.status}</p>
                  <p style={{ fontSize: '0.75rem', color: '#757575' }}>
                    Last synced: {integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString() : 'Never'}
                  </p>
                  {integration.error_message && (
                    <p style={{ fontSize: '0.75rem', color: '#F44336', marginTop: '8px' }}>
                      {integration.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>🔌 Available Integrations</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {availableIntegrations
            .filter(ai => !integrations.find(i => i.type === ai.type))
            .map(integration => (
              <div key={integration.type} style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)', height: '100%' }}>
                <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>{integration.name}</h5>
                <p style={{ fontSize: '0.875rem', color: '#757575', marginBottom: '16px' }}>{integration.description}</p>
                <button 
                  onClick={() => onConnect(integration.type)} 
                  style={{
                    backgroundColor: '#1976D2',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    width: '100%',
                  }}
                >
                  Connect
                </button>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const ScopeTab = ({ startupId }) => {
    return (
      <div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Startup Scope</h3>
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Product Scope</h4>
          <ProductScopeView startupId={startupId} />
        </div>
        <div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>GTM Scope</h4>
          <GtmScopeView startupId={startupId} />
        </div>
      </div>
    );
  };


  const renderContent = () => {
    const tab = new URLSearchParams(location.search).get('tab');
    switch (tab) {
      case 'product':
        return <ProductScopeView startupId={startup.id} />;
      case 'gtm':
        return <GtmScopeView startupId={startup.id} />;
      case 'funding':
        return <FundingTab />;
      case 'revenue':
        return <RevenueTab />;
      case '2':
        return <MetricsTab stages={stages} />;
      case '3':
        return <IntegrationsTab integrations={integrations} onConnect={(type) => {/* Handle integration */}} />;
      case '4':
        return <EvaluationTab submission={dashboardData.submission} />;
      case 'scope': // New case for ScopeTab
        return <ScopeTab startupId={startup.id} />;
      case 'ux-design': // New case for UX/UI Tab
        return <UxDesignView startupId={startup.id} />;
      case '5':
        return <ProductScopeView />;
      case '6':
        return <GtmScopeView />;
      case '7':
        return <UxDesignView />;
      case '8':
        return <BuildProgressView />;
      case '9':
        return <TestDeployView />;
      case '10':
        return <ShareMonitorView />;
      case '11':
        return <MonetizeGtmView />;
      case '12':
        return <FundraisingHandoverView />;
      default:
        return <OverviewTab startup={startup} stages={stages} recentActivity={recent_activity} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      <Sidebar onLogout={handleLogout} />
      <main
        style={{
          flexGrow: 1,
          paddingLeft: '280px', // Sidebar width
          paddingTop: '32px',
          paddingBottom: '32px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ opacity: 1, transition: 'opacity 500ms ease-in' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              {/* Progress Section */}
              <div>
                <div style={{ padding: '24px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>
                      Overall Progress
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          flexGrow: 1,
                          height: '10px',
                          borderRadius: '5px',
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${startup.overall_progress || 0}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '5px',
                          }}
                        ></div>
                      </div>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 700, minWidth: '60px' }}>
                        {startup.overall_progress || 0}%
                      </h4>
                    </div>
                  </div>
                  {stages.length > 0 && (
                    <StageProgressBar
                      stages={stages}
                      currentStage={startup.current_stage_key || 'founder_specifications'}
                      overallProgress={startup.overall_progress || 0}
                    />
                  )}
                </div>
              </div>

              {/* Alerts Section */}
              {alerts && alerts.length > 0 && (
                <div>
                  <div style={{ opacity: 1, transition: 'opacity 500ms ease-in' }}>
                    <div
                      style={{
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        backgroundColor: '#fff3e0',
                        padding: '16px',
                        color: '#f57c00',
                      }}
                    >
                      {alerts.map((alert, index) => (
                        <p key={index} style={{ marginBottom: index < alerts.length - 1 ? '8px' : '0' }}>
                          {alert.message}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div>
                <div style={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
                  <div style={{ padding: '24px' }}>
                    {renderContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};



export default Dashboard;