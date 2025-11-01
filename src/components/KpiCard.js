import React, { useState } from 'react';
// MUI Components
import { Box, Typography, Paper, LinearProgress, Button, TextField } from '@mui/material';

const KpiCard = ({ metric, editable = false, onEdit, onSave, isEditing }) => {
  const [editValue, setEditValue] = useState(metric?.value || 0);

  const getProgressColor = () => {
    if (!metric?.target) return 'primary'; // Default to primary color
    const ratio = metric.value / metric.target;
    if (ratio >= 1) return 'success';
    if (ratio >= 0.7) return 'warning';
    return 'error';
  };

  const formatValue = (value) => {
    if (!value && value !== 0) return '-';
    if (metric?.unit === 'currency') return `$${value.toLocaleString()}`;
    if (metric?.unit === 'percentage') return `${value}%`;
    return value.toLocaleString();
  };

  const handleSave = () => {
    onSave(editValue);
  };

  if (!metric) {
    return (
      <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1">Metric</Typography>
        <Typography variant="h5">-</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, borderLeft: `5px solid`, borderColor: `${getProgressColor()}.main` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>{metric.name}</Typography>
        {metric.source && (
          <Typography variant="caption" color="text.secondary">{metric.source}</Typography>
        )}
      </Box>

      {isEditing ? (
        <Box sx={{ mt: 1 }}>
          <TextField
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" size="small" onClick={handleSave} sx={{ mr: 1 }}>Save</Button>
            <Button variant="outlined" size="small" onClick={() => onEdit(null)}>Cancel</Button>
          </Box>
        </Box>
      ) : (
        <>
          <Typography variant="h4" component="div" onClick={editable ? onEdit : undefined} sx={{ cursor: editable ? 'pointer' : 'default' }}>
            {formatValue(metric.value)}
            {editable && <Typography component="span" sx={{ ml: 1 }}>✏️</Typography>}
          </Typography>

          {metric.target && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Target: {formatValue(metric.target)}
            </Typography>
          )}

          {metric.target && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((metric.value / metric.target) * 100, 100)}
                color={getProgressColor()}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {metric.last_synced_at && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Updated: {new Date(metric.last_synced_at).toLocaleDateString()}
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
};

export default KpiCard;
