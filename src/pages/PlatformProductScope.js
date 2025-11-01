import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Select, MenuItem, InputLabel, FormControl, List, ListItem, ListItemText } from '@mui/material';

const PlatformProductScope = () => {
  const { startupId } = useParams();
  const [scope, setScope] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [newFeaturePriority, setNewFeaturePriority] = useState('must-have');

  useEffect(() => {
    const fetchScopeAndFeatures = async () => {
      try {
        // In a real app, you'd fetch existing scope and features here
        // For now, we'll assume no existing scope and allow creation
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchScopeAndFeatures();
  }, [startupId]);

  const handleCreateScope = async () => {
    try {
      const response = await apiService.productScope.createScope(startupId);
      if (response.data.success) {
        setScope({ id: response.data.data.scope_id });
      }
    } catch (error) {
      console.error('Error creating scope:', error);
      setError(error.message);
    }
  };

  const handleAddFeature = async (e) => {
    e.preventDefault();
    if (!scope) return;
    try {
      const featureData = {
        title: newFeatureTitle,
        description: newFeatureDescription,
        priority: newFeaturePriority,
      };
      const response = await apiService.productScope.addFeature(scope.id, featureData);
      if (response.data.success) {
        setFeatures([...features, { ...featureData, id: response.data.data.feature_id }]);
        setNewFeatureTitle('');
        setNewFeatureDescription('');
      }
    } catch (error) {
      console.error('Error adding feature:', error);
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
        <Typography variant="h4" gutterBottom>Product Scope</Typography>
        {!scope ? (
          <Button variant="contained" onClick={handleCreateScope}>Create Scope</Button>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>Scope ID: {scope.id}</Typography>
            <Box component="form" onSubmit={handleAddFeature} sx={{ mt: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>Add New Feature</Typography>
              <TextField
                label="Feature Title"
                variant="outlined"
                fullWidth
                value={newFeatureTitle}
                onChange={(e) => setNewFeatureTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Feature Description"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={newFeatureDescription}
                onChange={(e) => setNewFeatureDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newFeaturePriority}
                  label="Priority"
                  onChange={(e) => setNewFeaturePriority(e.target.value)}
                >
                  <MenuItem value="must-have">Must-have</MenuItem>
                  <MenuItem value="should-have">Should-have</MenuItem>
                  <MenuItem value="later">Later</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" color="primary">Add Feature</Button>
            </Box>
            
            <Box>
              <Typography variant="h5" gutterBottom>Features</Typography>
              <List>
                {features.map(feature => (
                  <ListItem key={feature.id} disablePadding>
                    <ListItemText primary={`${feature.title} - ${feature.priority}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PlatformProductScope;
