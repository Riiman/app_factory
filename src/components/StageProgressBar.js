import React from 'react';
// MUI Components
import { Box, Typography, LinearProgress, Paper, Chip, Grid } from '@mui/material';

const StageProgressBar = ({ stages = [], currentStage, overallProgress = 0 }) => {
  // If no stages, don't render
  if (!stages || stages.length === 0) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'blocked': return 'error';
      case 'in_review': return 'warning';
      case 'not_started': return 'default';
      case 'skipped': return 'default';
      default: return 'default';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">MVP Development Progress</Typography>
        <Typography variant="subtitle1">{Math.round(overallProgress)}% Complete</Typography>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={overallProgress}
        sx={{ height: 10, borderRadius: 5, mb: 2 }}
      />

      <Grid container spacing={1} justifyContent="space-between">
        {stages.map((stage, index) => (
          <Grid item key={stage.id || index} xs>
            <Box 
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '15px',
                  left: '50%',
                  width: 'calc(100% - 30px)',
                  height: '2px',
                  backgroundColor: index < stages.length - 1 ? '#e0e0e0' : 'transparent',
                  zIndex: 0,
                  transform: 'translateX(-50%)',
                },
              }}
            >
              <Chip 
                label={stage.status === 'completed' ? '✓' : index + 1}
                color={getStatusColor(stage.status)}
                sx={{
                  zIndex: 1,
                  mb: 0.5,
                  backgroundColor: stage.stage_key === currentStage ? 'primary.main' : undefined,
                  color: stage.stage_key === currentStage ? 'white' : undefined,
                }}
              />
              <Typography variant="caption" align="center" sx={{ fontWeight: stage.stage_key === currentStage ? 'bold' : 'normal' }}>
                {stage.name || `Stage ${index + 1}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">{Math.round(stage.progress || 0)}%</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default StageProgressBar;
