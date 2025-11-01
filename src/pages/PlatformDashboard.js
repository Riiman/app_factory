import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import { AppBar, Toolbar, Typography, Button, Container, Paper, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Box } from '@mui/material';

const PlatformDashboard = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await apiService.platform.getSubmissions();
        if (response.data.success && response.data.data) {
          setSubmissions(response.data.data);
        } else {
          setError(response.data.error || 'Failed to fetch submissions');
        }
      } catch (err) {
        console.error('Error fetching platform dashboard submissions:', err);
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  const handleSubmissionClick = (submissionId) => {
    navigate(`/platform/evaluation/${submissionId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading submissions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" color="error" gutterBottom>⚠️ Error Loading Dashboard</Typography>
          <Typography variant="body1" paragraph>{error}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Retry</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Platform Dashboard
          </Typography>
          <Button color="inherit" onClick={() => navigate('/platform/monitor')}>Multi-Startup Monitor</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>Submissions for Review</Typography>
        <Paper elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Startup Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map(submission => (
                <TableRow key={submission.id} hover style={{ cursor: 'pointer' }}>
                  <TableCell onClick={() => handleSubmissionClick(submission.id)}>{submission.startup_name}</TableCell>
                  <TableCell onClick={() => handleSubmissionClick(submission.id)}>{submission.status}</TableCell>
                  <TableCell onClick={() => handleSubmissionClick(submission.id)}>{new Date(submission.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => navigate(`/platform/scope/${submission.startup.id}`)}>Scope</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => navigate(`/platform/gtm-scope/${submission.startup.id}`)}>GTM</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => navigate(`/platform/ux-design/${submission.startup.id}`)}>UX</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => navigate(`/platform/sprint-board/${submission.startup.id}`)}>Sprint</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => navigate(`/platform/deployment/${submission.startup.id}`)}>Deploy</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => navigate(`/platform/monetization/${submission.startup.id}`)}>Monetize</Button>
                    <Button variant="outlined" size="small" onClick={() => navigate(`/platform/fundraising/${submission.startup.id}`)}>Fundraise</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>
    </Box>
  );
};

export default PlatformDashboard;
