import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

// MUI Components
import { AppBar, Toolbar, Typography, Button, Container, Grid, Paper, Tabs, Tab, Box, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

// Custom Components
import StageProgressBar from '../components/StageProgressBar';
import StageCard from '../components/StageCard';
import KpiCard from '../components/KpiCard';
import AlertPanel from '../components/AlertPanel'; // This might need refactoring to MUI Alert
import ActivityFeed from '../components/ActivityFeed';
import ProductScopeView from '../components/ProductScopeView';
import GtmScopeView from '../components/GtmScopeView';
import UxDesignView from '../components/UxDesignView';
import BuildProgressView from '../components/BuildProgressView';
import TestDeployView from '../components/TestDeployView';
import ShareMonitorView from '../components/ShareMonitorView';
import MonetizeGtmView from '../components/MonetizeGtmView';
import FundraisingHandoverView from '../components/FundraisingHandoverView';

// Custom CSS (will be phased out)
import './Dashboard.css';

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.pxToRem(15),
  marginRight: theme.spacing(1),
  color: 'rgba(255, 255, 255, 0.7)',
  '&.Mui-selected': {
    color: '#fff',
  },
  '&.Mui-focusVisible': {
    backgroundColor: 'rgba(100, 95, 228, 0.3)',
  },
}));

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // Use index for MUI Tabs
  const [error, setError] = useState(null);

  const tabLabels = [
    'Overview', 'Stages', 'Metrics', 'Integrations', 'Evaluation',
    'Product Scope', 'GTM Scope', 'UX Design', 'Build Progress',
    'Test & Deploy', 'Share & Monitor', 'Monetize & GTM', 'Fundraising & Handover'
  ];

  const tabKeys = [
    'overview', 'stages', 'metrics', 'integrations', 'evaluation',
    'product-scope', 'gtm-scope', 'ux-design', 'build-progress',
    'test-deploy', 'share-monitor', 'monetize-gtm', 'fundraising'
  ];

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading your dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" color="error" gutterBottom>⚠️ Error Loading Dashboard</Typography>
          <Typography variant="body1" paragraph>{error}</Typography>
          <Button variant="contained" onClick={fetchDashboardData} sx={{ mr: 1 }}>Retry</Button>
          <Button variant="outlined" onClick={handleLogout}>Back to Login</Button>
        </Paper>
      </Container>
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
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {startup.name || 'My Startup'}
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Status: {startup.status || 'pending'}
          </Typography>
          <Button color="inherit" onClick={() => navigate('/profile')}>Profile</Button>
          <Button color="inherit" onClick={() => navigate('/settings')}>Settings</Button>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {/* Progress Bar */}
            {stages.length > 0 && (
              <StageProgressBar 
                stages={stages} 
                currentStage={startup.current_stage_key || 'founder_specifications'}
                overallProgress={startup.overall_progress || 0}
              />
            )}
          </Grid>

          <Grid item xs={12}>
            {/* Alerts */}
            {alerts && alerts.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {alerts.map((alert, index) => (
                  <Typography key={index} variant="body2">{alert.message}</Typography>
                ))}
              </Alert>
            )}
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={2}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="dashboard tabs"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {tabLabels.map((label, index) => (
                  <StyledTab key={index} label={label} />
                ))}
              </Tabs>
              <Box sx={{ p: 3 }}>
                {activeTab === 0 && (
                  <OverviewTab 
                    startup={startup}
                    stages={stages}
                    recentActivity={recent_activity}
                  />
                )}

                {activeTab === 1 && (
                  <StagesTab 
                    stages={stages}
                    onStageClick={(stageKey) => navigate(`/dashboard/stage/${stageKey}`)}
                  />
                )}

                {activeTab === 2 && (
                  <MetricsTab stages={stages} />
                )}

                {activeTab === 3 && (
                  <IntegrationsTab 
                    integrations={integrations}
                    onConnect={(type) => {/* Handle integration */}}
                  />
                )}

                {activeTab === 4 && (
                  <EvaluationTab submission={dashboardData.submission} />
                )}

                {activeTab === 5 && (
                  <ProductScopeView />
                )}

                {activeTab === 6 && (
                  <GtmScopeView />
                )}

                {activeTab === 7 && (
                  <UxDesignView />
                )}

                {activeTab === 8 && (
                  <BuildProgressView />
                )}

                {activeTab === 9 && (
                  <TestDeployView />
                )}

                {activeTab === 10 && (
                  <ShareMonitorView />
                )}

                {activeTab === 11 && (
                  <MonetizeGtmView />
                )}

                {activeTab === 12 && (
                  <FundraisingHandoverView />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

const EvaluationTab = ({ submission }) => {
  if (!submission || submission.status !== 'reviewed') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">Your submission has not been reviewed yet.</Typography>
      </Box>
    );
  }

  const actionTasks = JSON.parse(submission.action_tasks || '[]');

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Evaluation Feedback</Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Evaluation Summary</Typography>
        <Typography variant="body1">{submission.evaluation_summary}</Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Platform Feedback</Typography>
        <Typography variant="body1">{submission.platform_feedback}</Typography>
      </Box>

      {actionTasks.length > 0 && (
        <Box>
          <Typography variant="h6">Action Tasks</Typography>
          <ul>
            {actionTasks.map((task, index) => (
              <li key={index}><Typography variant="body1">{task}</Typography></li>
            ))}
          </ul>
        </Box>
      )}
    </Box>
  );
};


const OverviewTab = ({ startup, stages, recentActivity }) => {
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const inProgressStages = stages.filter(s => s.status === 'in_progress').length;
  const blockedStages = stages.filter(s => s.status === 'blocked').length;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            metric={{
              name: 'Overall Progress',
              value: Math.round(startup.overall_progress || 0),
              unit: 'percentage'
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            metric={{
              name: 'Stages Completed',
              value: completedStages,
              target: stages.length
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            metric={{
              name: 'In Progress',
              value: inProgressStages
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            metric={{
              name: 'Blocked',
              value: blockedStages
            }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Current Stage</Typography>
            {stages.find(s => s.stage_key === startup.current_stage_key) ? (
              <StageCard 
                stage={stages.find(s => s.stage_key === startup.current_stage_key)}
                featured
              />
            ) : (
              <Typography variant="body1">No active stage</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Recent Activity</Typography>
            <ActivityFeed activity={recentActivity} />
          </Paper>
        </Grid>
      </Grid>

      {inProgressStages > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>🎯 Next Steps</Typography>
          <Paper elevation={2} sx={{ p: 2 }}>
            <ul>
              {stages
                .filter(s => s.status === 'in_progress')
                .slice(0, 3)
                .map(stage => (
                  <li key={stage.id}>
                    <Typography variant="body1">
                      Complete <strong>{stage.name}</strong>
                      {stage.blockers && stage.blockers.length > 0 && (
                        <Typography component="span" color="error" sx={{ ml: 1 }}>⚠️ Blocked</Typography>
                      )}
                    </Typography>
                  </li>
                ))}
            </ul>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

const StagesTab = ({ stages, onStageClick }) => {
  if (stages.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">No stages available. Please complete your evaluation form first.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {stages.map(stage => (
          <Grid item xs={12} sm={6} md={4} key={stage.id}>
            <StageCard 
              stage={stage}
              onClick={() => onStageClick(stage.stage_key)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
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
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>Filter by Stage:</Typography>
        <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
          <option value="all">All Stages</option>
          {stages.map(stage => (
            <option key={stage.id} value={stage.stage_key}>
              {stage.name}
            </option>
          ))}
        </select>
      </Box>

      <Grid container spacing={2}>
        {metrics.map(metric => (
          <Grid item xs={12} sm={6} md={4} key={metric.id}>
            <KpiCard 
              metric={metric}
            />
          </Grid>
        ))}
        
        {metrics.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body1">No metrics available for this selection</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
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
    <Box>
      {integrations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>✅ Connected Integrations</Typography>
          <Grid container spacing={2}>
            {integrations.map(integration => (
              <Grid item xs={12} sm={6} md={4} key={integration.id}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="h6">{integration.type}</Typography>
                  <Typography variant="body2">Status: {integration.status}</Typography>
                  <Typography variant="body2">Last synced: {integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString() : 'Never'}</Typography>
                  {integration.error_message && (
                    <Typography variant="body2" color="error">{integration.error_message}</Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Typography variant="h5" gutterBottom>🔌 Available Integrations</Typography>
      <Grid container spacing={2}>
        {availableIntegrations
          .filter(ai => !integrations.find(i => i.type === ai.type))
          .map(integration => (
            <Grid item xs={12} sm={6} md={4} key={integration.type}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6">{integration.name}</Typography>
                <Typography variant="body2">{integration.description}</Typography>
                <Button variant="contained" onClick={() => onConnect(integration.type)} sx={{ mt: 2 }}>
                  Connect
                </Button>
              </Paper>
            </Grid>
          ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
