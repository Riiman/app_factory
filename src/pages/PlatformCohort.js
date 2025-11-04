import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

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
} from '@mui/material';

const PlatformCohort = () => {
  const [cohort, setCohort] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCohort = async () => {
      try {
        const response = await api.get('/platform/startups-with-metrics');
        if (response.data.success && Array.isArray(response.data.data)) {
          const cohortStartups = response.data.data.filter(s => s.status === 'in_cohort');
          setCohort(cohortStartups);
        } else {
          setError(response.data.error || 'Failed to fetch cohort');
        }
      } catch (err) {
        console.error('Error fetching cohort:', err);
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    };

    fetchCohort();
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading cohort...</Typography>
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
      <Typography variant="h4" component="h1" gutterBottom>
        Cohort
      </Typography>
      <Paper sx={{ borderRadius: '12px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Startup Name</TableCell>
                <TableCell>Current Stage</TableCell>
                <TableCell>Overall Progress</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cohort.map((startup) => (
                <TableRow key={startup.id} hover>
                  <TableCell component="th" scope="row">
                    {startup.name}
                  </TableCell>
                  <TableCell>{startup.current_stage_key}</TableCell>
                  <TableCell>{startup.overall_progress.toFixed(2)}%</TableCell>
                  <TableCell align="right">
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleNavigate(`/platform/ux-design/${startup.id}`)}>UX</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleNavigate(`/platform/sprint-board/${startup.id}`)}>Sprint</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleNavigate(`/platform/deployment/${startup.id}`)}>Deploy</Button>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleNavigate(`/platform/monetization/${startup.id}`)}>Monetize</Button>
                    <Button variant="outlined" size="small" onClick={() => handleNavigate(`/platform/fundraising/${startup.id}`)}>Fundraise</Button>
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

export default PlatformCohort;
