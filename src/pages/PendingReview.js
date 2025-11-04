import React from 'react';
import { Box, Container, Paper, Typography, CircularProgress, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/constants';

const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(8),
  padding: theme.spacing(4),
  textAlign: 'center',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  borderRadius: 16,
}));

const PendingReviewPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <Container maxWidth="sm">
      <StyledPaper>
        <CircularProgress sx={{ mb: 3 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Submission Pending Review
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your startup application has been submitted successfully and is currently under review by our team. You will be notified via email once the review process is complete.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This usually takes 3-5 business days.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </StyledPaper>
    </Container>
  );
};

export default PendingReviewPage;
