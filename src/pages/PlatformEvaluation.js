import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';
import SubmissionData from '../components/SubmissionData';

// MUI Components
import { Container, Box, Typography, Button, TextField, Paper, CircularProgress } from '@mui/material';

const PlatformEvaluation = () => {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evaluationSummary, setEvaluationSummary] = useState('');
  const [platformFeedback, setPlatformFeedback] = useState('');
  const [actionTasks, setActionTasks] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await apiService.platform.getSubmission(submissionId);
        if (response.data.success) {
          setSubmission(response.data.data);
          setEvaluationSummary(response.data.data.evaluation_summary || '');
          setPlatformFeedback(response.data.data.platform_feedback || '');
          setActionTasks(response.data.data.action_tasks || '');
        } else {
          setError(response.data.error);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchSubmission();
  }, [submissionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const evaluationData = {
        evaluation_summary: evaluationSummary,
        platform_feedback: platformFeedback,
        action_tasks: actionTasks,
      };
      await apiService.platform.evaluateSubmission(submissionId, evaluationData);
      // Optionally, show a success message or redirect
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading submission...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" color="error" gutterBottom>Error Loading Submission</Typography>
          <Typography variant="body1" paragraph>{error}</Typography>
        </Paper>
      </Container>
    );
  }

  if (!submission) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" color="error" gutterBottom>Submission Not Found</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Evaluate Submission</Typography>
      <SubmissionData submission={submission} />
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Evaluation</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            label="Evaluation Summary"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={evaluationSummary}
            onChange={(e) => setEvaluationSummary(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Platform Feedback"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={platformFeedback}
            onChange={(e) => setPlatformFeedback(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Action Tasks (JSON)"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={actionTasks}
            onChange={(e) => setActionTasks(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">Submit Evaluation</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PlatformEvaluation;
