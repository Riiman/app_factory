import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, Paper, CircularProgress, Tabs, Tab, LinearProgress, Select, MenuItem, InputLabel, FormControl, Grid } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Custom Components
import Checklist from '../components/Checklist';
import DynamicForm from '../components/DynamicForm';
import MetricsPanel from '../components/MetricsPanel';
import ArtifactList from '../components/ArtifactList';
import ExperimentList from '../components/ExperimentList';

const StagePage = () => {
  const { stageKey } = useParams();
  const navigate = useNavigate();
  const [stageData, setStageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // Use index for MUI Tabs

  const tabLabels = [
    'Checklist', 'Details', 'Metrics', 'Artifacts',
    ...(stageKey === 'gtm_scope' || stageKey === 'monetize_gtm' ? ['Experiments'] : [])
  ];

  useEffect(() => {
    fetchStageData();
  }, [stageKey]);

  const fetchStageData = async () => {
    try {
      setLoading(true);
      const response = await apiService.dashboard.getStage(stageKey);
      
      if (response.data.success) {
        setStageData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (event) => {
    const newStatus = event.target.value;
    try {
      await apiService.dashboard.updateStage(stageKey, { status: newStatus });
      fetchStageData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleFormSave = async (formData) => {
    try {
      await apiService.dashboard.updateStage(stageKey, { form_data: formData });
      fetchStageData();
    } catch (err) {
      console.error('Error saving form:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading stage...</Typography>
      </Box>
    );
  }

  if (!stageData) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" color="error" gutterBottom>Stage not found</Typography>
        </Paper>
      </Container>
    );
  }

  const { stage, template } = stageData;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>{stage.name}</Typography>
            <Typography variant="body1" color="text.secondary">{template?.description}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl variant="outlined" size="small" sx={{ mr: 2, minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select 
                value={stage.status} 
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
                <MenuItem value="in_review">In Review</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ minWidth: 120 }}>
              <Typography variant="body2">Progress: {Math.round(stage.progress)}%</Typography>
              <LinearProgress variant="determinate" value={stage.progress} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="stage tabs"
          >
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <Checklist 
              stageKey={stageKey}
              tasks={stage.tasks || []}
              onUpdate={fetchStageData}
            />
          )}

          {activeTab === 1 && (
            <DynamicForm 
              schema={template?.form_schema}
              initialValues={stage.form_data}
              onSave={handleFormSave}
            />
          )}

          {activeTab === 2 && (
            <MetricsPanel 
              stageKey={stageKey}
              metrics={stage.metrics || []}
              defaultMetrics={template?.default_metrics}
              onUpdate={fetchStageData}
            />
          )}

          {activeTab === 3 && (
            <ArtifactList 
              stageKey={stageKey}
              artifacts={stage.artifacts || []}
              onUpdate={fetchStageData}
            />
          )}

          {(stageKey === 'gtm_scope' || stageKey === 'monetize_gtm') && activeTab === 4 && (
            <ExperimentList 
              stageKey={stageKey}
              experiments={stage.experiments || []}
              onUpdate={fetchStageData}
            />
          )}
        </Box>

        {/* Acceptance Criteria Sidebar */}
        {stage.acceptance_criteria && stage.acceptance_criteria.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>Acceptance Criteria</Typography>
            <Box>
              {stage.acceptance_criteria.map((criterion, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" sx={{ mr: 1 }}>
                    {criterion.passed ? '✓' : '○'}
                  </Typography>
                  <Typography variant="body1">{criterion.rule.description}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default StagePage;
