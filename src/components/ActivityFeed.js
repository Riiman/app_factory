import React from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Card, 
  CardContent,
  Chip,
  Divider 
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
  CheckCircle,
  Description,
  Comment,
  Upload,
  Person,
  Schedule
} from '@mui/icons-material';

const ActivityItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: 12,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.05),
  },
}));

const ActivityIcon = styled(Avatar)(({ theme, type }) => {
  const getColor = () => {
    switch (type) {
      case 'task':
        return theme.palette.success.main;
      case 'document':
        return theme.palette.info.main;
      case 'comment':
        return theme.palette.warning.main;
      case 'upload':
        return theme.palette.primary.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return {
    width: 40,
    height: 40,
    background: alpha(getColor(), 0.1),
    color: getColor(),
  };
});

const TimelineConnector = styled(Box)(({ theme }) => ({
  width: 2,
  height: '100%',
  marginLeft: 19,
  background: theme.palette.grey[200],
}));

const ActivityFeed = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'task':
        return <CheckCircle />;
      case 'document':
        return <Description />;
      case 'comment':
        return <Comment />;
      case 'upload':
        return <Upload />;
      default:
        return <Person />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your activity will appear here
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
          Recent Activity
        </Typography>

        <Box>
          {activities.map((activity, index) => (
            <Box key={activity.id || index}>
              <ActivityItem>
                <Box sx={{ position: 'relative' }}>
                  <ActivityIcon type={activity.type}>
                    {getActivityIcon(activity.type)}
                  </ActivityIcon>
                  {index < activities.length - 1 && (
                    <TimelineConnector sx={{ position: 'absolute', top: 48, left: 0 }} />
                  )}
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {activity.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(activity.timestamp)}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 1 }}>
                    {activity.description}
                  </Typography>

                  {activity.tags && activity.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {activity.tags.map((tag, tagIndex) => (
                        <Chip 
                          key={tagIndex}
                          label={tag} 
                          size="small"
                          sx={{ height: 24 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </ActivityItem>

              {index < activities.length - 1 && (
                <Divider sx={{ my: 1, opacity: 0.5 }} />
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;