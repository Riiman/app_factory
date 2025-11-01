import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Box, Typography, LinearProgress, Paper, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

const BuildProgressView = () => {
  const [features, setFeatures] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBuildData = async () => {
      try {
        const [featuresRes, buildsRes] = await Promise.all([
          apiService.build.getBuildProgress(),
          apiService.build.getBuilds(),
        ]);

        if (featuresRes.data.success) {
          setFeatures(featuresRes.data.data);
        }

        if (buildsRes.data.success) {
          setBuilds(buildsRes.data.data);
        }

      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchBuildData();
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

  const completedFeatures = features.filter(f => f.build_status === 'completed').length;
  const progress = features.length > 0 ? (completedFeatures / features.length) * 100 : 0;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Build Progress</Typography>
      
      <Box sx={{ mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
        <Typography variant="body1" sx={{ mt: 1 }}>{Math.round(progress)}% complete</Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Feature Status</Typography>
        <List>
          {features.map(feature => (
            <ListItem key={feature.id} disablePadding>
              <ListItemText primary={`${feature.title}: ${feature.build_status}`} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>Changelog</Typography>
        <List>
          {builds.map(build => (
            <ListItem key={build.id} disablePadding>
              <ListItemText 
                primary={<Typography variant="subtitle1">Version {build.version_number} ({new Date(build.created_at).toLocaleDateString()})</Typography>}
                secondary={<Typography variant="body2">{build.changelog}</Typography>}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default BuildProgressView;
