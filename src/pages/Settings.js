import React from 'react';

// MUI Components
import { Container, Typography, Paper } from '@mui/material';

const Settings = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Settings</Typography>
        <Typography variant="body1" paragraph>Settings page coming soon...</Typography>
      </Paper>
    </Container>
  );
};

export default Settings;
