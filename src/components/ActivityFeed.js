import React from 'react';
// MUI Components
import { Box, Typography, Paper, List, ListItem, ListItemText, ListItemIcon, Avatar } from '@mui/material';
// Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const ActivityFeed = ({ activity }) => {
  if (!activity || (!activity.tasks?.length && !activity.artifacts?.length)) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">No recent activity</Typography>
      </Box>
    );
  }

  const allActivity = [
    ...activity.tasks.map(t => ({ ...t, type: 'task', time: t.updated_at })),
    ...activity.artifacts.map(a => ({ ...a, type: 'artifact', time: a.created_at }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  const getActivityIcon = (item) => {
    if (item.type === 'task') {
      return item.status === 'done' ? <CheckCircleOutlineIcon color="success" /> : <AssignmentIcon color="info" />;
    }
    return <AttachFileIcon color="action" />;
  };

  const getActivityText = (item) => {
    if (item.type === 'task') {
      return item.status === 'done' ? 'Completed task' : 'Updated task';
    }
    return 'Added artifact';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Box>
      <List>
        {allActivity.slice(0, 10).map((item, index) => (
          <ListItem key={`${item.type}-${item.id}-${index}`} disablePadding sx={{ mb: 1 }}>
            <ListItemIcon>
              <Avatar sx={{ bgcolor: 'primary.light' }}>
                {getActivityIcon(item)}
              </Avatar>
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography variant="body1">
                  <strong>{getActivityText(item)}:</strong> {item.title}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {formatTime(item.time)}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ActivityFeed;
