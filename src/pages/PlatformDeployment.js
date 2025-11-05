import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Select, MenuItem, InputLabel, FormControl, Link } from '@mui/material';

const PlatformDeployment = () => {
  const { startupId } = useParams();
  const [deployments, ] = useState([]);
  const [environment, setEnvironment] = useState('staging');
  const [url, setUrl] = useState('');
  const [feedbackFormUrl, setFeedbackFormUrl] = useState('');
  const [launchChecklist, setLaunchChecklist] = useState('');
  const [buildId, setBuildId] = useState(''); // Assuming buildId is selected from a list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch existing deployments here
    setLoading(false);
  }, [startupId]);

  const handleCreateDeployment = async (e) => {
    e.preventDefault();
    try {
      const deploymentData = {
        build_id: buildId,
        environment,
        url,
        feedback_form_url: feedbackFormUrl,
        launch_checklist: launchChecklist ? JSON.parse(launchChecklist) : [],
      };
      await apiService.deployment.createDeployment(buildId, deploymentData);
      // Refresh deployments
    } catch (error) {
      console.error('Error creating deployment:', error);
      setError(error.message);
    }
  };

  const handleUpdateDeployment = async (deploymentId, newStatus) => {
    try {
      await apiService.deployment.updateDeployment(deploymentId, { status: newStatus });
      // Refresh deployments
    } catch (error) {
      console.error('Error updating deployment:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Deployment Console</Typography>
        <Box component="form" onSubmit={handleCreateDeployment} sx={{ mt: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>Create New Deployment</Typography>
          <TextField
            label="Build ID"
            variant="outlined"
            fullWidth
            value={buildId}
            onChange={(e) => setBuildId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Environment</InputLabel>
            <Select
              value={environment}
              label="Environment"
              onChange={(e) => setEnvironment(e.target.value)}
            >
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="URL"
            variant="outlined"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Feedback Form URL"
            variant="outlined"
            fullWidth
            value={feedbackFormUrl}
            onChange={(e) => setFeedbackFormUrl(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Launch Checklist (JSON Array)"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={launchChecklist}
            onChange={(e) => setLaunchChecklist(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button type="submit" variant="contained" color="primary">Create Deployment</Button>
        </Box>

        <Typography variant="h5" gutterBottom>Existing Deployments</Typography>
        {deployments.map(deployment => (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }} key={deployment.id}>
            <Typography variant="h6">{deployment.environment} Deployment</Typography>
            <Typography variant="body1"><strong>URL:</strong> 
              {deployment.url ? <Link href={deployment.url} target="_blank" rel="noopener noreferrer">{deployment.url}</Link> : 'N/A'}
            </Typography>
            <Typography variant="body1"><strong>Status:</strong> {deployment.status}</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleUpdateDeployment(deployment.id, 'deployed')}>Mark as Deployed</Button>
              <Button variant="outlined" size="small" onClick={() => handleUpdateDeployment(deployment.id, 'awaiting_approval')}>Awaiting Approval</Button>
            </Box>
          </Paper>
        ))}
      </Paper>
    </Container>
  );
};

export default PlatformDeployment;
