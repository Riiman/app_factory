import React from 'react';
// MUI Components
import { Box, Alert, AlertTitle, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const AlertPanel = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  const getSeverity = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {alerts.map((alert, index) => (
        <Alert 
          key={index} 
          severity={getSeverity(alert.severity)}
          action={
            onDismiss && (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => onDismiss(index)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )
          }
          sx={{ mb: 1 }}
        >
          <AlertTitle>{alert.message}</AlertTitle>
          {alert.stage_key && (
            <Typography variant="body2">Stage: {alert.stage_key}</Typography>
          )}
          {alert.blockers && alert.blockers.length > 0 && (
            <Typography variant="body2">Blockers: {alert.blockers.join(', ')}</Typography>
          )}
        </Alert>
      ))}
    </Box>
  );
};

export default AlertPanel;
