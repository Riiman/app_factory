import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Box, Typography, Button, Paper, CircularProgress, Link } from '@mui/material';

const FundraisingHandoverView = () => {
  const [fundraisingData, setFundraisingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFundraisingData = async () => {
      try {
        const response = await apiService.fundraising.getDashboardFundraising();
        if (response.data.success) {
          setFundraisingData(response.data.data);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchFundraisingData();
  }, []);

  const handlePayCommission = async () => {
    try {
      await apiService.fundraising.payCommission();
      // Refresh data
    } catch (error) {
      console.error('Error paying commission:', error);
    }
  };

  const handleRequestCodeAccess = async () => {
    try {
      await apiService.fundraising.requestCodeAccess();
      // Refresh data
    } catch (error) {
      console.error('Error requesting code access:', error);
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

  if (!fundraisingData) {
    return <Typography>Fundraising data not yet available.</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Fundraising & Handover</Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Fundraising Readiness</Typography>
        <Typography variant="body1"><strong>Readiness Score:</strong> {fundraisingData.readiness_score}</Typography>
        <Typography variant="body1"><strong>Pitch Deck:</strong> 
          {fundraisingData.pitch_deck_url ? 
            <Link href={fundraisingData.pitch_deck_url} target="_blank" rel="noopener noreferrer">View Pitch Deck</Link> : 
            'Not available'}
        </Typography>
        <Typography variant="body1"><strong>Investor Connect Status:</strong> {fundraisingData.investor_connect_status}</Typography>
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>Commission & Code Access</Typography>
        <Typography variant="body1"><strong>Commission Status:</strong> {fundraisingData.commission_status}</Typography>
        {fundraisingData.commission_status === 'pending' && (
          <Button variant="contained" color="primary" onClick={handlePayCommission} sx={{ mt: 1 }}>Pay Commission</Button>
        )}
        <Typography variant="body1" sx={{ mt: 2 }}><strong>Code Access Status:</strong> {fundraisingData.code_access_status}</Typography>
        {fundraisingData.code_access_status === 'locked' && (
          <Button variant="contained" onClick={handleRequestCodeAccess} sx={{ mt: 1 }}>Request Code Access</Button>
        )}
      </Box>
    </Paper>
  );
};

export default FundraisingHandoverView;
