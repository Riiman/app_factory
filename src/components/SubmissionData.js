import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Button, CircularProgress } from '@mui/material';
import useApi from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import AnalysisModal from './AnalysisModal';

const SubmissionData = ({ submission }) => {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [analysisStream, setAnalysisStream] = useState('');
  const { showSuccess, showError } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    setModalOpen(true);
    setAnalysisStream('Starting analysis...\n');
    console.log('handleAnalyze called');

    try {
      const response = await fetch(`/api/analyze-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ submission_id: submission.id })
      });

      console.log('Response received from backend');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream finished');
          break;
        }
        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
        setAnalysisStream(prev => prev + chunk);
      }

      setAnalysisStream(prev => prev + '\n\nAnalysis complete.');
      setTimeout(() => {
        setModalOpen(false);
        showSuccess('Analysis complete and data pre-filled.');
      }, 2000);

    } catch (error) {
        console.error('Error during analysis:', error);

        // The error is inside this string. 
        // Make sure there are no stray backslashes '\' before words.
        const errorMessage = `

      --- ANALYSIS FAILED ---
      Error: ${error.message || 'An unexpected error occurred.'}

      Please check the console for more details and try again later.`;

        setAnalysisStream(prev => prev + errorMessage);
        showError('Analysis failed. See modal for details.');
    } finally {
      setLoading(false);
    }
  };
    const handleCloseModal = () => {
    setModalOpen(false);
  };

  const renderField = (label, value) => (
    <Grid item xs={12} sm={6} key={label}>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value || 'N/A'}</Typography>
    </Grid>
  );

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <AnalysisModal open={modalOpen} handleClose={handleCloseModal} analysisStream={analysisStream} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom>Submission Data</Typography>
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Analyzing...' : 'Analyze with AI'}
        </Button>
      </Box>
      <Grid container spacing={2}>
        {renderField('Startup Name', submission.startup_name)}
        {renderField('Website', submission.website_url)}
        {renderField('Founding Year', submission.founding_year)}
        {renderField('Number of Founders', submission.number_of_founders)}
        {renderField('Team Size', submission.team_size)}
        {renderField('Headquarters', submission.headquarters)}
        {renderField('Founder LinkedIn', submission.founder_linkedin)}
        {renderField('Team Description', submission.team_description)}
        {renderField('Company Overview', submission.company_overview)}
        {renderField('Problem Statement', submission.problem_statement)}
        {renderField('Solution', submission.solution)}
        {renderField('Unique Value Proposition', submission.unique_value_proposition)}
        {renderField('Tech Stack', submission.tech_stack)}
        {renderField('Key Features', submission.key_features)}
        {renderField('Target Market', submission.target_market)}
        {renderField('Customer Segments', submission.customer_segments)}
        {renderField('Competition', submission.competition)}
        {renderField('Competitive Advantage', submission.competitive_advantage)}
        {renderField('Pricing Strategy', submission.pricing_strategy)}
        {renderField('Go-to-Market Strategy', submission.go_to_market_strategy)}
        {renderField('Funding Required', submission.funding_required)}
        {renderField('Current Stage', submission.current_stage)}
        {renderField('Revenue Streams', submission.revenue_streams)}
        {renderField('Business Model', submission.business_model)}
        {renderField('Pitch Deck URL', submission.pitch_deck_url)}
        {renderField('Demo URL', submission.demo_url)}
      </Grid>
    </Paper>
  );
};

export default SubmissionData;
