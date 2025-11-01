import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress } from '@mui/material';

const PlatformGtmScope = () => {
  const { startupId } = useParams();
  const [icp, setIcp] = useState('');
  const [targetGeographies, setTargetGeographies] = useState('');
  const [channels, setChannels] = useState('');
  const [positioningStatement, setPositioningStatement] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch existing GTM scope here if it exists
    setLoading(false);
  }, [startupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const gtmData = { icp, targetGeographies, channels, positioningStatement };
      await apiService.gtmScope.createOrUpdateScope(startupId, gtmData);
      // show success message
    } catch (error) {
      console.error('Error saving GTM scope:', error);
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
        <Typography variant="h4" gutterBottom>GTM Scope</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            label="Ideal Customer Profile (ICP)"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={icp}
            onChange={(e) => setIcp(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Target Geographies"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={targetGeographies}
            onChange={(e) => setTargetGeographies(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Channels"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={channels}
            onChange={(e) => setChannels(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Positioning Statement"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={positioningStatement}
            onChange={(e) => setPositioningStatement(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">Save GTM Scope</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PlatformGtmScope;
