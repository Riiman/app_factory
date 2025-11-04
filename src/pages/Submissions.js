import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

// MUI Components
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';

const Submissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await apiService.platform.getSubmissions();
        if (response.data.success && Array.isArray(response.data.submissions)) {
          setSubmissions(response.data.submissions);
        } else {
          setError(response.data.error || 'Failed to fetch submissions');
        }
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  const handleViewSubmission = (submissionId) => {
    navigate(`/platform/evaluation/${submissionId}`);
  };

  const getStatusChip = (status) => {
    let color = 'default';
    if (status === 'pending') {
      color = 'warning';
    } else if (status === 'in-review') {
      color = 'info';
    } else if (status === 'approved') {
      color = 'success';
    }
    return <Chip label={status} color={color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading submissions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{
            background: 'linear-gradient(45deg, #1976D2 30%, #673AB7 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Submissions for Review
          </Typography>
          <Typography color="text.secondary">Review and manage startup submissions</Typography>
        </Box>
        <Button variant="contained" sx={{
          background: 'linear-gradient(45deg, #1976D2 30%, #673AB7 90%)',
        }}>
          Export Data
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pending</Typography>
              <Typography variant="body2" color="text.secondary">Awaiting initial review</Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {submissions.filter(s => s.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">In Review</Typography>
              <Typography variant="body2" color="text.secondary">Currently being evaluated</Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {submissions.filter(s => s.status === 'in-review').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Approved</Typography>
              <Typography variant="body2" color="text.secondary">Ready for next steps</Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {submissions.filter(s => s.status === 'approved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: '12px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Startup Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id} hover>
                  <TableCell component="th" scope="row">
                    {submission.startup_name}
                  </TableCell>
                  <TableCell>{getStatusChip(submission.status)}</TableCell>
                  <TableCell>{new Date(submission.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleViewSubmission(submission.id)}
                    >
                      Evaluate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Submissions;
