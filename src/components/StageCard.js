import React from 'react';
import './StageCard.css';

const StageCard = ({ stage, onClick, featured = false }) => {
  const getStatusBadge = (status) => {
    const badges = {
      'completed': { text: 'Completed', class: 'status-completed' },
      'in_progress': { text: 'In Progress', class: 'status-in-progress' },
      'blocked': { text: 'Blocked', class: 'status-blocked' },
      'in_review': { text: 'In Review', class: 'status-in-review' },
      'not_started': { text: 'Not Started', class: 'status-not-started' }
    };
    return badges[status] || badges['not_started'];
  };

  const statusBadge = getStatusBadge(stage.status);

  return (
    <div 
      className={`stage-card ${featured ? 'featured' : ''} ${stage.status}`}
      onClick={onClick}
    >
      <div className="stage-card-header">
        <div className="stage-number">Stage {stage.order}</div>
        <span className={`status-badge ${statusBadge.class}`}>
          {statusBadge.text}
        </span>
      </div>

      <h3 className="stage-title">{stage.name}</h3>
      
      <div className="stage-progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${stage.progress}%` }}
          />
        </div>
        <span className="progress-text">{Math.round(stage.progress)}%</span>
      </div>

      {stage.due_date && (
        <div className="stage-meta">
          <span className="meta-label">Due:</span>
          <span className="meta-value">
            {new Date(stage.due_date).toLocaleDateString()}
          </span>
        </div>
      )}

      {stage.blockers && stage.blockers.length > 0 && (
        <div className="stage-blockers">
          <span className="blocker-icon">⚠️</span>
          <span>{stage.blockers.length} blocker(s)</span>
        </div>
      )}

      <div className="stage-stats">
        <div className="stat">
          <span className="stat-value">{stage.tasks?.length || 0}</span>
          <span className="stat-label">Tasks</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stage.metrics?.length || 0}</span>
          <span className="stat-label">Metrics</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stage.artifacts?.length || 0}</span>
          <span className="stat-label">Files</span>
        </div>
      </div>
    </div>
  );
};

export default StageCard;