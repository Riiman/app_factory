import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress } from '@mui/material';

const PlatformUxDesign = () => {
  const { startupId } = useParams();
  const [wireframeUrl, setWireframeUrl] = useState('');
  const [mockupUrl, setMockupUrl] = useState('');
  const [finalUiUrl, setFinalUiUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch existing UX scope here if it exists
    setLoading(false);
  }, [startupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const uxData = { wireframe_url: wireframeUrl, mockup_url: mockupUrl, final_ui_url: finalUiUrl };
      await apiService.uxDesign.createOrUpdateScope(startupId, uxData);
      // show success message
    } catch (error) {
      console.error('Error saving UX design scope:', error);
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
        <Typography variant="h4" gutterBottom>UX Design Scope</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            label="Wireframe URL"
            variant="outlined"
            fullWidth
            value={wireframeUrl}
            onChange={(e) => setWireframeUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Mockup URL"
            variant="outlined"
            fullWidth
            value={mockupUrl}
            onChange={(e) => setMockupUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Final UI URL"
            variant="outlined"
            fullWidth
            value={finalUiUrl}
            onChange={(e) => setFinalUiUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">Save UX Design Scope</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PlatformUxDesign;
