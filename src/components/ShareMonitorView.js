import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import KpiCard from './KpiCard';

// MUI Components
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';

const ShareMonitorView = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await apiService.analytics.getDashboardAnalytics();
        if (response.data.success) {
          setMetrics(response.data.data);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchAnalytics();
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

  const analyticsMetrics = metrics.filter(m => m.metric_type === 'analytics');
  const marketingMetrics = metrics.filter(m => m.metric_type === 'marketing');

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Share & Monitor</Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Analytics Dashboard</Typography>
        <Grid container spacing={2}>
          {analyticsMetrics.map(metric => (
            <Grid item xs={12} sm={6} md={4} key={metric.id}>
              <KpiCard metric={metric} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>AI Insights (Placeholder)</Typography>
        <Typography variant="body1" paragraph>AI-powered insights will appear here to help you understand your data.</Typography>
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>Marketing KPIs</Typography>
        <Grid container spacing={2}>
          {marketingMetrics.map(metric => (
            <Grid item xs={12} sm={6} md={4} key={metric.id}>
              <KpiCard metric={metric} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Paper>
  );
};

export default ShareMonitorView;
