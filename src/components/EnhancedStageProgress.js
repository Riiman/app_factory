
import React from 'react';
import { Box, Typography, LinearProgress, Tooltip, Chip } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { 
  CheckCircle, 
  RadioButtonUnchecked, 
  PlayCircle,
  Lock 
} from '@mui/icons-material';

const StageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.4),
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
}));

const StatusIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: '50%',
  flexShrink: 0,
}));

const StageTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  flex: 1,
}));

const StageDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(1),
}));

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 6,
  borderRadius: 3,
  backgroundColor: alpha(theme.palette.grey[300], 0.5),
  '& .MuiLinearProgress-bar': {
    backgroundColor: theme.palette.primary.main,
  },
}));

const StageItem = ({ stage, isActive, isCompleted, isLocked, onStageClick }) => {
  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle sx={{ color: 'success.main' }} />;
    if (isActive) return <PlayCircle sx={{ color: 'primary.main' }} />;
    if (isLocked) return <Lock sx={{ color: 'grey.500' }} />;
    return <RadioButtonUnchecked sx={{ color: 'grey.400' }} />;
  };

  const getStageColor = () => {
    if (isCompleted) return 'success.main';
    if (isActive) return 'primary.main';
    if (isLocked) return 'grey.500';
    return 'grey.400';
  };

  return (
    <StageContainer onClick={onStageClick}>
      <StatusIcon>
        {getStatusIcon()}
      </StatusIcon>
      <Box flex={1}>
        <StageTitle variant="subtitle2">
          {stage.title}
        </StageTitle>
        <StageDescription variant="body2">
          {stage.description}
        </StageDescription>
        {stage.progress !== undefined && (
          <ProgressContainer>
            <StyledLinearProgress 
              variant="determinate" 
              value={stage.progress} 
            />
          </ProgressContainer>
        )}
      </Box>
      {stage.tags && stage.tags.length > 0 && (
        <Box display="flex" gap={1} flexWrap="wrap">
          {stage.tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                '& .MuiChip-label': {
                  fontSize: '0.75rem',
                },
              }}
            />
          ))}
        </Box>
      )}
    </StageContainer>
  );
};

export default StageItem;
