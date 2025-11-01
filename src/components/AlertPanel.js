import React from 'react';
import './AlertPanel.css';

const AlertPanel = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  const getAlertIcon = (type) => {
    const icons = {
      blocked_stage: '🚫',
      overdue_tasks: '⏰',
      stale_metrics: '📊',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  const getSeverityClass = (severity) => {
    return `alert-${severity}` || 'alert-info';
  };

  return (
    <div className="alert-panel">
      {alerts.map((alert, index) => (
        <div key={index} className={`alert ${getSeverityClass(alert.severity)}`}>
          <span className="alert-icon">{getAlertIcon(alert.type)}</span>
          <div className="alert-content">
            <p className="alert-message">{alert.message}</p>
            {alert.stage_key && (
              <span className="alert-meta">Stage: {alert.stage_key}</span>
            )}
          </div>
          {onDismiss && (
            <button 
              className="alert-dismiss"
              onClick={() => onDismiss(index)}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default AlertPanel;
