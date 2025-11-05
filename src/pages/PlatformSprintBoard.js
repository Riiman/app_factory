import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Paper, CircularProgress, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const PlatformSprintBoard = () => {
  const { startupId } = useParams();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This is a placeholder. In a real app, you'd fetch the features 
    // for the startup's approved product scope.
    const fetchFeatures = async () => {
      try {
        // Assuming you have an API endpoint to get features for a startup's approved product scope
        // For now, let's mock some features or leave it empty
        setFeatures([
          { id: 1, title: 'User Authentication', build_status: 'pending' },
          { id: 2, title: 'Product Listing Page', build_status: 'in_progress' },
          { id: 3, title: 'Shopping Cart', build_status: 'completed' },
        ]);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchFeatures();
  }, [startupId]);

  const handleStatusChange = async (featureId, newStatus) => {
    try {
      await apiService.build.updateFeatureStatus(featureId, { build_status: newStatus });
      setFeatures(features.map(f => (f.id === featureId ? { ...f, build_status: newStatus } : f)));
    } catch (error) {
      console.error('Error updating feature status:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading sprint board...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  const columns = {
    pending: features.filter(f => f.build_status === 'pending'),
    in_progress: features.filter(f => f.build_status === 'in_progress'),
    completed: features.filter(f => f.build_status === 'completed'),
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Sprint Board - Startup: {startupId}</Typography>
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {Object.keys(columns).map(status => (
          <Grid item xs={12} md={4} key={status}>
            <Paper elevation={3} sx={{ p: 2, minHeight: '300px' }}>
              <Typography variant="h5" gutterBottom>{status.replace('_', ' ').toUpperCase()}</Typography>
              {columns[status].map(feature => (
                <Paper key={feature.id} elevation={1} sx={{ p: 1.5, mb: 1.5 }}>
                  <Typography variant="subtitle1">{feature.title}</Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={feature.build_status}
                      label="Status"
                      onChange={(e) => handleStatusChange(feature.id, e.target.value)}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Paper>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default PlatformSprintBoard;
