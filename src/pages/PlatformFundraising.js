import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

const PlatformFundraising = () => {
  const { startupId } = useParams();
  const [readinessScore, setReadinessScore] = useState(0);
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [investorConnectStatus, setInvestorConnectStatus] = useState('pending');
  const [commissionStatus, setCommissionStatus] = useState('pending');
  const [codeAccessStatus, setCodeAccessStatus] = useState('locked');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch existing fundraising data here
    setLoading(false);
  }, [startupId]);

  const handleSaveFundraising = async (e) => {
    e.preventDefault();
    try {
      const fundraisingData = {
        readiness_score: readinessScore,
        pitch_deck_url: pitchDeckUrl,
        investor_connect_status: investorConnectStatus,
        commission_status: commissionStatus,
        code_access_status: codeAccessStatus,
      };
      await apiService.fundraising.createOrUpdateFundraising(startupId, fundraisingData);
      // show success message
    } catch (error) {
      console.error('Error saving fundraising settings:', error);
      setError(error.message);
    }
  };

  const handleCodeHandover = async (e) => {
    e.preventDefault();
    try {
      await apiService.fundraising.manageCodeHandover(startupId, { code_access_status: codeAccessStatus });
      // show success message
    } catch (error) {
      console.error('Error managing code handover:', error);
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
        <Typography variant="h4" gutterBottom>Fundraising & Handover</Typography>
        
        <Box component="form" onSubmit={handleSaveFundraising} sx={{ mt: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>Fundraising Details</Typography>
          <TextField
            label="Readiness Score"
            variant="outlined"
            fullWidth
            type="number"
            value={readinessScore}
            onChange={(e) => setReadinessScore(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Pitch Deck URL"
            variant="outlined"
            fullWidth
            value={pitchDeckUrl}
            onChange={(e) => setPitchDeckUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Investor Connect Status"
            variant="outlined"
            fullWidth
            value={investorConnectStatus}
            onChange={(e) => setInvestorConnectStatus(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Commission Status"
            variant="outlined"
            fullWidth
            value={commissionStatus}
            onChange={(e) => setCommissionStatus(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Code Access Status"
            variant="outlined"
            fullWidth
            value={codeAccessStatus}
            onChange={(e) => setCodeAccessStatus(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">Save Fundraising Details</Button>
        </Box>

        <Box component="form" onSubmit={handleCodeHandover} sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>Code Handover</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Code Access Status</InputLabel>
            <Select
              value={codeAccessStatus}
              label="Code Access Status"
              onChange={(e) => setCodeAccessStatus(e.target.value)}
            >
              <MenuItem value="locked">Locked</MenuItem>
              <MenuItem value="requested">Requested</MenuItem>
              <MenuItem value="granted">Granted</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" color="primary">Update Code Handover Status</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PlatformFundraising;
