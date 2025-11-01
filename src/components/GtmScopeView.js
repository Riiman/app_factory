import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';

const GtmScopeView = () => {
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGtmScope = async () => {
      try {
        const response = await apiService.gtmScope.getScope();
        if (response.data.success) {
          setScope(response.data.data);
        } else {
          setError(response.data.error);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchGtmScope();
  }, []);

  const handleApprove = async () => {
    try {
      await apiService.gtmScope.approveScope();
      // refresh data
    } catch (error) {
      console.error('Error approving GTM scope:', error);
    }
  };

  const handleRequestChanges = async () => {
    try {
      await apiService.gtmScope.requestChanges();
      // refresh data
    } catch (error) {
      console.error('Error requesting changes to GTM scope:', error);
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

  if (!scope) {
    return <Typography>GTM scope not yet defined.</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>GTM Scope</Typography>
      <Typography variant="h6" gutterBottom>Status: {scope.status}</Typography>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Ideal Customer Profile (ICP)</Typography>
        <Typography variant="body1" paragraph>{scope.icp}</Typography>

        <Typography variant="h6">Target Geographies</Typography>
        <Typography variant="body1" paragraph>{scope.target_geographies}</Typography>

        <Typography variant="h6">Channels</Typography>
        <Typography variant="body1" paragraph>{scope.channels}</Typography>

        <Typography variant="h6">Positioning Statement</Typography>
        <Typography variant="body1" paragraph>{scope.positioning_statement}</Typography>
      </Box>

      {scope.status === 'in_review' && (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" color="primary" onClick={handleApprove} sx={{ mr: 2 }}>Approve GTM Scope</Button>
          <Button variant="outlined" color="secondary" onClick={handleRequestChanges}>Request Changes</Button>
        </Box>
      )}
    </Paper>
  );
};

export default GtmScopeView;
