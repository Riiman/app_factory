import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Box, Typography, Button, TextField, Paper, CircularProgress, Grid, List, ListItem, ListItemText } from '@mui/material';

const ProductScopeView = () => {
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchScope = async () => {
      try {
        const response = await apiService.productScope.getScope();
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

    fetchScope();
  }, []);

  const handleAddComment = async (featureId) => {
    try {
      await apiService.productScope.addComment(featureId, { content: comment });
      setComment('');
      // Refresh scope data (re-fetch scope or update state locally)
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await apiService.productScope.approveScope();
      // Refresh scope data
    } catch (error) {
      console.error('Error approving scope:', error);
    }
  };

  const handleRequestChanges = async () => {
    try {
      await apiService.productScope.requestChanges();
      // Refresh scope data
    } catch (error) {
      console.error('Error requesting changes:', error);
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
    return <Typography>Product scope not yet defined.</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Product Scope</Typography>
      <Typography variant="h6" gutterBottom>Status: {scope.status}</Typography>
      
      <Grid container spacing={3}>
        {scope.features.map(feature => (
          <Grid item xs={12} sm={6} md={4} key={feature.id}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>{feature.title}</Typography>
              <Typography variant="body2" paragraph>{feature.description}</Typography>
              <Typography variant="body2"><strong>Priority:</strong> {feature.priority}</Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Comments</Typography>
                <List dense>
                  {feature.comments.map((c, i) => (
                    <ListItem key={i} disablePadding>
                      <ListItemText primary={c} />
                    </ListItem>
                  ))}
                </List>
                <TextField
                  label="Add a comment"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mt: 1, mb: 1 }}
                />
                <Button variant="contained" size="small" onClick={() => handleAddComment(feature.id)}>Add Comment</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {scope.status === 'in_review' && (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" color="primary" onClick={handleApprove} sx={{ mr: 2 }}>Approve Scope</Button>
          <Button variant="outlined" color="secondary" onClick={handleRequestChanges}>Request Changes</Button>
        </Box>
      )}
    </Box>
  );
};

export default ProductScopeView;
