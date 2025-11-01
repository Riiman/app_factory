import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

// MUI Components
import { Container, Box, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

const PlatformMultiStartupMonitor = () => {
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const response = await apiService.platform.getAllStartupsWithMetrics(); 
        if (response.data.success) {
          setStartups(response.data.data);
        } else {
          setError(response.data.error);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchStartups();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading startups...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Multi-Startup Monitor</Typography>
        <Table sx={{ mt: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Startup Name</TableCell>
              <TableCell>Overall Progress</TableCell>
              <TableCell>Key Metrics</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {startups.map(startup => (
              <TableRow key={startup.id}>
                <TableCell>{startup.name}</TableCell>
                <TableCell>{startup.overall_progress}%</TableCell>
                <TableCell>
                  {startup.metrics && startup.metrics.map(metric => (
                    <Typography key={metric.id} variant="body2">{metric.name}: {metric.value} {metric.unit} </Typography>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default PlatformMultiStartupMonitor;
