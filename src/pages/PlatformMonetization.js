import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress } from '@mui/material';

const PlatformMonetization = () => {
  const { startupId } = useParams();
  const [paymentIntegrationType, setPaymentIntegrationType] = useState('');
  const [revenueSharePercentage, setRevenueSharePercentage] = useState(0);
  const [campaignName, setCampaignName] = useState('');
  const [campaignChannel, setCampaignChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch existing monetization data here
    setLoading(false);
  }, [startupId]);

  const handleSaveMonetization = async (e) => {
    e.preventDefault();
    try {
      const monetizationData = { payment_integration_type: paymentIntegrationType, revenue_share_percentage: revenueSharePercentage };
      await apiService.monetization.createOrUpdateMonetization(startupId, monetizationData);
      // show success message
    } catch (error) {
      console.error('Error saving monetization settings:', error);
      setError(error.message);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const campaignData = { name: campaignName, channel: campaignChannel };
      await apiService.monetization.createCampaign(startupId, campaignData);
      // show success message
    } catch (error) {
      console.error('Error creating campaign:', error);
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
        <Typography variant="h4" gutterBottom>Monetization & Campaigns</Typography>
        
        <Box component="form" onSubmit={handleSaveMonetization} sx={{ mt: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>Monetization Settings</Typography>
          <TextField
            label="Payment Integration Type"
            variant="outlined"
            fullWidth
            value={paymentIntegrationType}
            onChange={(e) => setPaymentIntegrationType(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Revenue Share Percentage"
            variant="outlined"
            fullWidth
            type="number"
            value={revenueSharePercentage}
            onChange={(e) => setRevenueSharePercentage(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">Save Monetization Settings</Button>
        </Box>

        <Box component="form" onSubmit={handleCreateCampaign} sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>Create New Campaign</Typography>
          <TextField
            label="Campaign Name"
            variant="outlined"
            fullWidth
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Channel"
            variant="outlined"
            fullWidth
            value={campaignChannel}
            onChange={(e) => setCampaignChannel(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">Create Campaign</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PlatformMonetization;
