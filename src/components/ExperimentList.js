import React, { useState } from 'react';
import apiService from '../services/api';
import './ExperimentList.css';

const ExperimentList = ({ stageKey, experiments, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hypothesis: '',
    status: 'draft'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.experiments.createExperiment(stageKey, formData);
      setFormData({ name: '', hypothesis: '', status: 'draft' });
      setShowAddForm(false);
      onUpdate();
    } catch (err) {
      console.error('Error creating experiment:', err);
    }
  };

  return (
    <div className="experiment-list">
      <div className="experiment-header">
        <h3>GTM Experiments</h3>
        <button 
          className="btn-primary btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + New Experiment
        </button>
      </div>

      {showAddForm && (
        <form className="add-experiment-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Experiment name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <textarea
            placeholder="Hypothesis"
            value={formData.hypothesis}
            onChange={(e) => setFormData({...formData, hypothesis: e.target.value})}
            required
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="experiments-grid">
        {experiments.length === 0 ? (
          <div className="empty-state">
            <p>No experiments yet. Create your first experiment!</p>
          </div>
        ) : (
          experiments.map(experiment => (
            <div key={experiment.id} className="experiment-card">
              <div className="experiment-header-card">
                <h4>{experiment.name}</h4>
                <span className={`status-badge status-${experiment.status}`}>
                  {experiment.status}
                </span>
              </div>
              <p className="experiment-hypothesis">{experiment.hypothesis}</p>
              {experiment.results && Object.keys(experiment.results).length > 0 && (
                <div className="experiment-results">
                  <strong>Results:</strong>
                  <pre>{JSON.stringify(experiment.results, null, 2)}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExperimentList;
