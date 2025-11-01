import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import Checklist from '../components/Checklist';
import DynamicForm from '../components/DynamicForm';
import MetricsPanel from '../components/MetricsPanel';
import ArtifactList from '../components/ArtifactList';
import ExperimentList from '../components/ExperimentList';
import './StagePage.css';

const StagePage = () => {
  const { stageKey } = useParams();
  const navigate = useNavigate();
  const [stageData, setStageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checklist');

  useEffect(() => {
    fetchStageData();
  }, [stageKey]);

  const fetchStageData = async () => {
    try {
      setLoading(true);
      const response = await apiService.dashboard.getStage(stageKey);
      
      if (response.data.success) {
        setStageData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiService.dashboard.updateStage(stageKey, { status: newStatus });
      fetchStageData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleFormSave = async (formData) => {
    try {
      await apiService.dashboard.updateStage(stageKey, { form_data: formData });
      fetchStageData();
    } catch (err) {
      console.error('Error saving form:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading stage...</div>;
  }

  if (!stageData) {
    return <div className="error">Stage not found</div>;
  }

  const { stage, template } = stageData;

  return (
    <div className="stage-page">
      {/* Header */}
      <div className="stage-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        
        <div className="stage-info">
          <h1>{stage.name}</h1>
          <p className="stage-description">{template?.description}</p>
        </div>

        <div className="stage-meta">
          <div className="status-selector">
            <label>Status:</label>
            <select 
              value={stage.status} 
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="in_review">In Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="progress-indicator">
            <span>Progress: {Math.round(stage.progress)}%</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${stage.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="stage-tabs">
        <button 
          className={activeTab === 'checklist' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('checklist')}
        >
          Checklist ({stage.tasks?.length || 0})
        </button>
        <button 
          className={activeTab === 'form' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('form')}
        >
          Details
        </button>
        <button 
          className={activeTab === 'metrics' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics ({stage.metrics?.length || 0})
        </button>
        <button 
          className={activeTab === 'artifacts' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('artifacts')}
        >
          Artifacts ({stage.artifacts?.length || 0})
        </button>
        {(stageKey === 'gtm_scope' || stageKey === 'monetize_gtm') && (
          <button 
            className={activeTab === 'experiments' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('experiments')}
          >
            Experiments ({stage.experiments?.length || 0})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="stage-content">
        {activeTab === 'checklist' && (
          <Checklist 
            stageKey={stageKey}
            tasks={stage.tasks || []}
            onUpdate={fetchStageData}
          />
        )}

        {activeTab === 'form' && (
          <DynamicForm 
            schema={template?.form_schema}
            initialValues={stage.form_data}
            onSave={handleFormSave}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsPanel 
            stageKey={stageKey}
            metrics={stage.metrics || []}
            defaultMetrics={template?.default_metrics}
            onUpdate={fetchStageData}
          />
        )}

        {activeTab === 'artifacts' && (
          <ArtifactList 
            stageKey={stageKey}
            artifacts={stage.artifacts || []}
            onUpdate={fetchStageData}
          />
        )}

        {activeTab === 'experiments' && (
          <ExperimentList 
            stageKey={stageKey}
            experiments={stage.experiments || []}
            onUpdate={fetchStageData}
          />
        )}
      </div>

      {/* Acceptance Criteria Sidebar */}
      {stage.acceptance_criteria && stage.acceptance_criteria.length > 0 && (
        <div className="acceptance-criteria-panel">
          <h3>Acceptance Criteria</h3>
          {stage.acceptance_criteria.map((criterion, idx) => (
            <div key={idx} className={`criterion ${criterion.passed ? 'passed' : 'pending'}`}>
              <span className="criterion-icon">{criterion.passed ? '✓' : '○'}</span>
              <span className="criterion-text">{criterion.rule.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StagePage;
