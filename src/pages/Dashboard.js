import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { FaRocket, FaChartLine, FaCheckCircle, FaClock, FaExternalLinkAlt, FaKey, FaUsers, FaDollarSign, FaCode, FaServer, FaBullhorn, FaTrophy } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCredentials, setShowCredentials] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await apiService.dashboard.getDashboard();
      console.log('Dashboard data:', response.data);
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        // No submission yet, redirect to evaluation form
        navigate('/evaluation-form');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 404) {
        navigate('/evaluation-form');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <h2>Dashboard Not Found</h2>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  const { submission, progress, milestones, product_updates, gtm_campaigns } = dashboardData;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="startup-info">
            <h1>{submission.startup_name}</h1>
            <span className={`status-badge status-${submission.status}`}>
              {submission.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <button className="btn-logout" onClick={() => navigate('/logout')}>
            Logout
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="quick-stats">
        <div className="stat-card">
          <FaRocket className="stat-icon" />
          <div className="stat-content">
            <h3>MVP Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${progress.mvp_development.overall_progress}%`}}
              ></div>
            </div>
            <p>{progress.mvp_development.overall_progress}% Complete</p>
            <small className="current-phase">{progress.mvp_development.current_phase}</small>
          </div>
        </div>

        <div className="stat-card">
          <FaChartLine className="stat-icon" />
          <div className="stat-content">
            <h3>GTM Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill gtm" 
                style={{width: `${progress.gtm_strategy.overall_progress}%`}}
              ></div>
            </div>
            <p>{progress.gtm_strategy.overall_progress}% Complete</p>
            <small className="current-phase">{progress.gtm_strategy.current_phase}</small>
          </div>
        </div>

        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{progress.business_metrics.total_users}</p>
            <small>{progress.business_metrics.active_users_30d} active (30d)</small>
          </div>
        </div>

        <div className="stat-card">
          <FaDollarSign className="stat-icon" />
          <div className="stat-content">
            <h3>Monthly Revenue</h3>
            <p className="stat-number">${progress.business_metrics.mrr.toLocaleString()}</p>
            <small>Total: ${progress.business_metrics.total_revenue.toLocaleString()}</small>
          </div>
        </div>
      </section>

      {/* Product Access Section */}
      {(submission.product_url_dev || submission.product_url_production) && (
        <section className="product-access">
          <h2><FaServer /> Your Product Access</h2>
          <div className="access-cards">
            {submission.product_url_dev && (
              <div className="access-card">
                <h3>Development Environment</h3>
                <p>Test new features before they go live</p>
                <a 
                  href={submission.product_url_dev} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-access"
                >
                  Open Dev Site <FaExternalLinkAlt />
                </a>
              </div>
            )}

            {submission.product_url_staging && (
              <div className="access-card">
                <h3>Staging Environment</h3>
                <p>Preview upcoming releases</p>
                <a 
                  href={submission.product_url_staging} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-access"
                >
                  Open Staging <FaExternalLinkAlt />
                </a>
              </div>
            )}

            {submission.product_url_production && (
              <div className="access-card production">
                <h3>🚀 Live Production</h3>
                <p>Your live product available to users</p>
                <a 
                  href={submission.product_url_production} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-access primary"
                >
                  Open Live Site <FaExternalLinkAlt />
                </a>
              </div>
            )}
          </div>

          {/* Admin Credentials */}
          {submission.admin_email && (
            <div className="credentials-section">
              <button 
                className="btn-show-credentials"
                onClick={() => setShowCredentials(!showCredentials)}
              >
                <FaKey /> {showCredentials ? 'Hide' : 'Show'} Admin Credentials
              </button>
              
              {showCredentials && (
                <div className="credentials-box">
                  <div className="credential-item">
                    <label>Admin Email:</label>
                    <code>{submission.admin_email}</code>
                  </div>
                  <div className="credential-item">
                    <label>Temporary Password:</label>
                    <code>{submission.admin_temp_password}</code>
                  </div>
                  <p className="credential-note">
                    ⚠️ Please change your password after first login
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          <FaRocket /> Overview
        </button>
        <button 
          className={activeTab === 'mvp' ? 'active' : ''} 
          onClick={() => setActiveTab('mvp')}
        >
          <FaCode /> MVP Development
        </button>
        <button 
          className={activeTab === 'gtm' ? 'active' : ''} 
          onClick={() => setActiveTab('gtm')}
        >
          <FaBullhorn /> GTM Strategy
        </button>
        <button 
          className={activeTab === 'updates' ? 'active' : ''} 
          onClick={() => setActiveTab('updates')}
        >
          <FaCheckCircle /> Updates
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab 
            progress={progress}
            milestones={milestones}
            submission={submission}
          />
        )}
        
        {activeTab === 'mvp' && (
          <MVPTab 
            progress={progress.mvp_development}
            milestones={milestones.filter(m => m.milestone_type === 'mvp')}
            submission={submission}
          />
        )}
        
        {activeTab === 'gtm' && (
          <GTMTab 
            progress={progress.gtm_strategy}
            campaigns={gtm_campaigns}
            metrics={progress.business_metrics}
            milestones={milestones.filter(m => m.milestone_type === 'gtm')}
          />
        )}
        
        {activeTab === 'updates' && (
          <UpdatesTab 
            updates={product_updates}
          />
        )}
      </main>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ progress, milestones, submission }) => {
  const upcomingMilestones = milestones
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.target_date) - new Date(b.target_date))
    .slice(0, 5);

  const recentMilestones = milestones
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))
    .slice(0, 3);

  return (
    <div className="overview-tab">
      <section className="overview-section">
        <h2>Development Timeline</h2>
        {submission.development_started_at && (
          <div className="timeline-info">
            <p>Started: {new Date(submission.development_started_at).toLocaleDateString()}</p>
            {progress.mvp_development.estimated_completion && (
              <p>Expected Completion: {new Date(progress.mvp_development.estimated_completion).toLocaleDateString()}</p>
            )}
          </div>
        )}

        <div className="phase-progress">
          <h3>Development Phases</h3>
          <div className="phases-grid">
            <PhaseCard 
              title="Foundation" 
              progress={progress.mvp_development.phases.foundation}
              description="Core infrastructure and setup"
            />
            <PhaseCard 
              title="Core Features" 
              progress={progress.mvp_development.phases.core_features}
              description="Main product functionality"
            />
            <PhaseCard 
              title="Integrations" 
              progress={progress.mvp_development.phases.integrations}
              description="Third-party services"
            />
            <PhaseCard 
              title="Testing" 
              progress={progress.mvp_development.phases.testing}
              description="Quality assurance and validation"
            />
          </div>
        </div>
      </section>

      <section className="overview-section">
        <h2>Upcoming Milestones</h2>
        {upcomingMilestones.length > 0 ? (
          <div className="milestones-list">
            {upcomingMilestones.map(milestone => (
              <div key={milestone.id} className="milestone-item">
                <h4>{milestone.title}</h4>
                <p className="milestone-description">{milestone.description}</p>
                <div className="milestone-meta">
                  <span className="milestone-date">
                    <FaClock /> {new Date(milestone.target_date).toLocaleDateString()}
                  </span>
                  <span className="milestone-status">
                    {milestone.status === 'planned' ? 'Planned' : milestone.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No upcoming milestones</p>
        )}
      </section>

      <section className="overview-section">
        <h2>Recent Milestones</h2>
        {recentMilestones.length > 0 ? (
          <div className="milestones-list">
            {recentMilestones.map(milestone => (
              <div key={milestone.id} className="milestone-item completed">
                <h4>{milestone.title}</h4>
                <p className="milestone-description">{milestone.description}</p>
                <div className="milestone-meta">
                  <span className="milestone-date">
                    <FaCheckCircle /> Completed: {new Date(milestone.completed_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No completed milestones yet</p>
        )}
      </section>
    </div>
  );
};

// MVP Tab Component
const MVPTab = ({ progress, milestones, submission }) => {
  return (
    <div className="mvp-tab">
      <section className="mvp-section">
        <h2>MVP Development Progress</h2>
        <div className="progress-overview">
          <div className="progress-summary">
            <h3>Overall Progress</h3>
            <p className="progress-percent">{progress.overall_progress}%</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${progress.overall_progress}%`}}
              ></div>
            </div>
            <p className="current-phase">Current Phase: {progress.current_phase}</p>
          </div>
        </div>

        <div className="milestones-section">
          <h3>Development Milestones</h3>
          <div className="milestones-grid">
            {milestones.map(milestone => (
              <div key={milestone.id} className={`milestone-card ${milestone.status}`}>
                <h4>{milestone.title}</h4>
                <p>{milestone.description}</p>
                <div className="milestone-details">
                  <span className="milestone-date">
                    {new Date(milestone.target_date).toLocaleDateString()}
                  </span>
                  <span className="milestone-status">
                    {milestone.status === 'completed' ? 'Completed' : 
                     milestone.status === 'in_progress' ? 'In Progress' : 'Planned'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// GTM Tab Component
const GTMTab = ({ progress, campaigns, metrics, milestones }) => {
  return (
    <div className="gtm-tab">
      <section className="gtm-section">
        <h2>GTM Strategy Progress</h2>
        <div className="progress-overview">
          <div className="progress-summary">
            <h3>Overall Progress</h3>
            <p className="progress-percent">{progress.overall_progress}%</p>
            <div className="progress-bar">
              <div 
                className="progress-fill gtm" 
                style={{width: `${progress.overall_progress}%`}}
              ></div>
            </div>
            <p className="current-phase">Current Phase: {progress.current_phase}</p>
          </div>
        </div>

        <div className="campaigns-section">
          <h3>Active Campaigns</h3>
          {campaigns.length > 0 ? (
            <div className="campaigns-grid">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="campaign-card">
                  <h4>{campaign.name}</h4>
                  <p className="campaign-type">{campaign.type}</p>
                  <div className="campaign-metrics">
                    <div className="metric">
                      <span className="metric-value">{campaign.conversions}</span>
                      <span className="metric-label">Conversions</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">${campaign.revenue.toLocaleString()}</span>
                      <span className="metric-label">Revenue</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{campaign.click_through_rate}%</span>
                      <span className="metric-label">CTR</span>
                    </div>
                  </div>
                  <div className="campaign-status">
                    <span className={`status-badge ${campaign.status}`}>
                      {campaign.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No active campaigns</p>
          )}
        </div>

        <div className="business-metrics">
          <h3>Business Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <FaUsers className="metric-icon" />
              <h4>Total Users</h4>
              <p className="metric-value">{metrics.total_users}</p>
            </div>
            <div className="metric-card">
              <FaDollarSign className="metric-icon" />
              <h4>Monthly Revenue</h4>
              <p className="metric-value">${metrics.mrr.toLocaleString()}</p>
            </div>
            <div className="metric-card">
              <FaChartLine className="metric-icon" />
              <h4>Conversion Rate</h4>
              <p className="metric-value">{metrics.conversion_rate}%</p>
            </div>
            <div className="metric-card">
              <FaTrophy className="metric-icon" />
              <h4>Customer Lifetime Value</h4>
              <p className="metric-value">${metrics.clv.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Updates Tab Component
const UpdatesTab = ({ updates }) => {
  return (
    <div className="updates-tab">
      <section className="updates-section">
        <h2>Product Updates</h2>
        {updates.length > 0 ? (
          <div className="updates-list">
            {updates.map(update => (
              <div key={update.id} className="update-item">
                <div className="update-header">
                  <h3>{update.title}</h3>
                  <span className="update-date">
                    {new Date(update.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="update-content">
                  <p>{update.description}</p>
                  {update.changes && (
                    <div className="update-changes">
                      <h4>Changes:</h4>
                      <ul>
                        {update.changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="update-tags">
                  {update.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No product updates available</p>
        )}
      </section>
    </div>
  );
};

// Phase Card Component
const PhaseCard = ({ title, progress, description }) => {
  return (
    <div className="phase-card">
      <h4>{title}</h4>
      <p className="phase-description">{description}</p>
      <div className="phase-progress">
        <div className="progress-bar-small">
          <div 
            className="progress-fill-small" 
            style={{width: `${progress}%`}}
          ></div>
        </div>
        <span className="progress-text">{progress}%</span>
      </div>
    </div>
  );
};

export default Dashboard;
