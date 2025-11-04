import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StyledCard = styled(Card)(({ theme, gradient }) => ({
  height: '100%',
  borderRadius: 16,
  background: gradient || 'white',
  color: gradient ? 'white' : theme.palette.text.primary,
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at top right, rgba(255, 255, 255, 0.2), transparent)',
    pointerEvents: 'none',
  },
}));

const IconWrapper = styled(Avatar)(({ theme, bgcolor }) => ({
  width: 56,
  height: 56,
  background: bgcolor || alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
}));

const TrendIndicator = styled(Box)(({ theme, trend }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5, 1),
  borderRadius: 8,
  background: trend === 'up' 
    ? alpha(theme.palette.success.main, 0.1)
    : alpha(theme.palette.error.main, 0.1),
  color: trend === 'up' ? theme.palette.success.main : theme.palette.error.main,
  fontSize: '0.75rem',
  fontWeight: 600,
}));

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  gradient, 
  trend, 
  trendValue,
  subtitle 
}) => {
  return (
    <StyledCard gradient={gradient}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: gradient ? 0.9 : 0.7,
                fontWeight: 500,
                mb: 1 
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                mb: 1,
                background: gradient ? 'none' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: gradient ? 'none' : 'text',
                WebkitTextFillColor: gradient ? 'inherit' : 'transparent',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="caption" 
                sx={{ opacity: gradient ? 0.8 : 0.6 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <IconWrapper 
            bgcolor={gradient ? alpha('#fff', 0.2) : undefined}
            sx={{ color: gradient ? 'white' : undefined }}
          >
            {icon}
          </IconWrapper>
        </Box>

        {trend && trendValue && (
          <TrendIndicator trend={trend}>
            {trend === 'up' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
            <span>{trendValue}</span>
          </TrendIndicator>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default StatsCard;