import React from 'react';
// MUI Components
import { Box, Typography, Paper, LinearProgress, Chip, Grid, Button } from '@mui/material';

const StageCard = ({ stage, onClick, featured = false }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'blocked': return 'error';
      case 'in_review': return 'warning';
      case 'not_started': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'blocked': return 'Blocked';
      case 'in_review': return 'In Review';
      case 'not_started': return 'Not Started';
      default: return 'N/A';
    }
  };

  return (
    <Paper 
      elevation={featured ? 4 : 2} 
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        border: featured ? '2px solid' : 'none',
        borderColor: 'primary.main',
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">Stage {stage.order}</Typography>
        <Chip label={getStatusText(stage.status)} color={getStatusColor(stage.status)} size="small" />
      </Box>

      <Typography variant="h6" component="h3" gutterBottom>{stage.name}</Typography>
      
      <Box sx={{ my: 1 }}>
        <LinearProgress 
          variant="determinate" 
          value={stage.progress}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{Math.round(stage.progress)}%</Typography>
      </Box>

      {stage.due_date && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Due: {new Date(stage.due_date).toLocaleDateString()}
        </Typography>
      )}

      {stage.blockers && stage.blockers.length > 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          ⚠️ {stage.blockers.length} blocker(s)
        </Typography>
      )}

      <Grid container spacing={1} sx={{ mt: 2 }}>
        <Grid item xs={4}>
          <Typography variant="caption" display="block">Tasks</Typography>
          <Typography variant="subtitle1">{stage.tasks?.length || 0}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" display="block">Metrics</Typography>
          <Typography variant="subtitle1">{stage.metrics?.length || 0}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" display="block">Files</Typography>
          <Typography variant="subtitle1">{stage.artifacts?.length || 0}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StageCard;