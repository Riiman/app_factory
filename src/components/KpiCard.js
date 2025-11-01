import React, { useState } from 'react';
import './KpiCard.css';

const KpiCard = ({ metric, editable = false, onEdit, onSave, isEditing }) => {
  const [editValue, setEditValue] = useState(metric?.value || 0);

  const getProgressColor = () => {
    if (!metric?.target) return '#3b82f6';
    const ratio = metric.value / metric.target;
    if (ratio >= 1) return '#10b981';
    if (ratio >= 0.7) return '#f59e0b';
    return '#ef4444';
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
      <div className="kpi-card">
        <div className="kpi-title">{metric?.title || 'Metric'}</div>
        <div className="kpi-value">-</div>
      </div>
    );
  }

  return (
    <div className="kpi-card" style={{ borderTopColor: getProgressColor() }}>
      <div className="kpi-header">
        <div className="kpi-title">{metric.name}</div>
        {metric.source && (
          <span className="kpi-source">{metric.source}</span>
        )}
      </div>

      {isEditing ? (
        <div className="kpi-edit">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
          />
          <div className="edit-actions">
            <button className="btn-sm btn-primary" onClick={handleSave}>Save</button>
            <button className="btn-sm btn-secondary" onClick={() => onEdit(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="kpi-value" onClick={editable ? onEdit : undefined}>
            {formatValue(metric.value)}
            {editable && <span className="edit-icon">✏️</span>}
          </div>

          {metric.target && (
            <div className="kpi-target">
              Target: {formatValue(metric.target)}
            </div>
          )}

          {metric.target && (
            <div className="kpi-progress">
              <div 
                className="kpi-progress-bar"
                style={{ 
                  width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                  backgroundColor: getProgressColor()
                }}
              />
            </div>
          )}

          {metric.last_synced_at && (
            <div className="kpi-sync">
              Updated: {new Date(metric.last_synced_at).toLocaleDateString()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KpiCard;
