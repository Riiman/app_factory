import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Box, Typography, Button, TextField, Paper, CircularProgress, Grid } from '@mui/material';

const UxDesignView = () => {
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchUxDesignScope = async () => {
      try {
        const response = await apiService.uxDesign.getScope();
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

    fetchUxDesignScope();
  }, []);

  const handleApprove = async (designType) => {
    try {
      await apiService.uxDesign.approveScope({ design_type: designType });
      // refresh data
    } catch (error) {
      console.error(`Error approving ${designType}:`, error);
    }
  };

  const handleAddComment = async (context) => {
    try {
      await apiService.uxDesign.addComment({ content: comment, context });
      setComment('');
      // refresh data
    } catch (error) {
      console.error('Error adding comment:', error);
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
    return <Typography>UX design scope not yet defined.</Typography>;
  }

  const DesignArtifact = ({ title, status, url, designType }) => (
    <Grid item xs={12} md={4}>
      <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body2">Status: {status}</Typography>
        {url && 
          <Box sx={{ my: 2, border: '1px solid #ddd', height: '250px', overflow: 'hidden' }}>
            <iframe src={url} width="100%" height="100%" frameBorder="0" allowFullScreen title={title}></iframe>
          </Box>
        }
        {status === 'in_review' && (
          <Button variant="contained" size="small" onClick={() => handleApprove(designType)} sx={{ mt: 1 }}>Approve</Button>
        )}
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Add a comment"
            variant="outlined"
            fullWidth
            multiline
            rows={1}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Button variant="outlined" size="small" onClick={() => handleAddComment(`ux_${designType}`)}>Add Comment</Button>
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>UX Design Scope</Typography>
      <Typography variant="h6" gutterBottom>Status: {scope.status}</Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <DesignArtifact 
          title="Wireframes" 
          status={scope.wireframe_status} 
          url={scope.wireframe_url} 
          designType="wireframe" 
        />
        <DesignArtifact 
          title="Mockups" 
          status={scope.mockup_status} 
          url={scope.mockup_url} 
          designType="mockup" 
        />
        <DesignArtifact 
          title="Final UI" 
          status={scope.final_ui_status} 
          url={scope.final_ui_url} 
          designType="final_ui" 
        />
      </Grid>
    </Box>
  );
};

export default UxDesignView;
