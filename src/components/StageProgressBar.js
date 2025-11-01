import React from 'react';
import './StageProgressBar.css';

const StageProgressBar = ({ stages = [], currentStage, overallProgress = 0 }) => {
  // If no stages, don't render
  if (!stages || stages.length === 0) {
    return null;
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': '#10b981',
      'in_progress': '#f59e0b',
      'blocked': '#ef4444',
      'in_review': '#3b82f6',
      'not_started': '#9ca3af',
      'skipped': '#6b7280'
    };
    return colors[status] || '#9ca3af';
  };

  return (
    <div className="stage-progress-bar">
      <div className="progress-header">
        <h3>MVP Development Progress</h3>
        <span className="overall-progress">{Math.round(overallProgress)}% Complete</span>
      </div>
      
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      <div className="stages-container">
        {stages.map((stage, index) => (
          <div 
            key={stage.id || index} 
            className={`stage-item ${stage.stage_key === currentStage ? 'current' : ''}`}
          >
            <div 
              className="stage-indicator"
              style={{ 
                backgroundColor: getStatusColor(stage.status),
                borderColor: stage.stage_key === currentStage ? '#1e40af' : 'transparent'
              }}
            >
              {stage.status === 'completed' ? '✓' : index + 1}
            </div>
            <div className="stage-info">
              <span className="stage-name">{stage.name || `Stage ${index + 1}`}</span>
              <span className="stage-progress">{Math.round(stage.progress || 0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StageProgressBar;
