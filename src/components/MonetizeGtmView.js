import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import KpiCard from './KpiCard';

// MUI Components
import { Box, Typography, Grid, Paper, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

const MonetizeGtmView = () => {
  const [monetizationData, setMonetizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMonetizationData = async () => {
      try {
        const response = await apiService.monetization.getDashboardMonetization();
        if (response.data.success) {
          setMonetizationData(response.data.data);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchMonetizationData();
  }, []);

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

  if (!monetizationData) {
    return <Typography>Monetization data not yet available.</Typography>;
  }

  const { monetization, campaigns } = monetizationData;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Monetize & GTM Execution</Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Revenue Tracker</Typography>
        <Grid container spacing={2}>
          {monetization && (
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard 
                metric={{
                  name: 'Revenue Share Percentage',
                  value: monetization.revenue_share_percentage,
                  unit: '%'
                }}
              />
            </Grid>
          )}
          {/* Add MRR, ARR, etc. KPI cards here */}
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Active Campaigns</Typography>
        <List>
          {campaigns.map(campaign => (
            <ListItem key={campaign.id} disablePadding>
              <ListItemText 
                primary={<Typography variant="subtitle1">{campaign.name} ({campaign.channel})</Typography>}
                secondary={<Typography variant="body2">Status: {campaign.status} | Budget: {campaign.budget} | ROI: {campaign.roi}</Typography>}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Marketing Spend ROI (Placeholder)</Typography>
        <Typography variant="body1" paragraph>Marketing spend ROI visualization will appear here.</Typography>
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>Conversion Funnel Visualization (Placeholder)</Typography>
        <Typography variant="body1" paragraph>Conversion funnel visualization will appear here.</Typography>
      </Box>
    </Paper>
  );
};

export default MonetizeGtmView;
