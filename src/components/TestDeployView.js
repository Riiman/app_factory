import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Box, Typography, Button, TextField, Paper, CircularProgress, Link, List, ListItem, ListItemText } from '@mui/material';

const TestDeployView = () => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const response = await apiService.deployment.getDeployments();
        if (response.data.success) {
          setDeployments(response.data.data);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchDeployments();
  }, []);

  const handleApproveRelease = async (deploymentId) => {
    try {
      await apiService.deployment.approveRelease(deploymentId);
      // Refresh deployments
    } catch (error) {
      console.error('Error approving release:', error);
    }
  };

  const handleSubmitFeedback = async (deploymentId) => {
    try {
      await apiService.deployment.submitFeedback(deploymentId, { feedback });
      setFeedback('');
      // Refresh deployments
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Test & Deploy</Typography>
      {deployments.length === 0 && <Typography variant="body1">No deployments yet.</Typography>}

      {deployments.map(deployment => (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }} key={deployment.id}>
          <Typography variant="h5" gutterBottom>{deployment.environment} Deployment</Typography>
          <Typography variant="body1"><strong>URL:</strong> 
            {deployment.url ? <Link href={deployment.url} target="_blank" rel="noopener noreferrer">{deployment.url}</Link> : 'N/A'}
          </Typography>
          <Typography variant="body1"><strong>Status:</strong> {deployment.status}</Typography>
          
          {deployment.feedback_form_url && (
            <Typography variant="body1"><strong>Feedback Form:</strong> 
              <Link href={deployment.feedback_form_url} target="_blank" rel="noopener noreferrer">{deployment.feedback_form_url}</Link>
            </Typography>
          )}
          
          {deployment.launch_checklist && JSON.parse(deployment.launch_checklist).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Launch Checklist</Typography>
              <List dense>
                {JSON.parse(deployment.launch_checklist).map((item, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {deployment.status === 'awaiting_approval' && (
            <Button variant="contained" color="primary" onClick={() => handleApproveRelease(deployment.id)} sx={{ mt: 2 }}>Approve for Public Release</Button>
          )}
          
          <Box sx={{ mt: 3 }}>
            <TextField
              label="Submit Feedback"
              variant="outlined"
              fullWidth
              multiline
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Button variant="contained" onClick={() => handleSubmitFeedback(deployment.id)}>Submit Feedback</Button>
          </Box>
        </Paper>
      ))}
    </Paper>
  );
};

export default TestDeployView;
