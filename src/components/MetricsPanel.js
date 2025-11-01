import React, { useState } from 'react';
import apiService from '../services/api';
import KpiCard from './KpiCard';
import './MetricsPanel.css';

const MetricsPanel = ({ stageKey, metrics, defaultMetrics, onUpdate }) => {
  const [editingMetric, setEditingMetric] = useState(null);
  const [showAddMetric, setShowAddMetric] = useState(false);

  const handleUpdateMetric = async (metric, newValue) => {
    try {
      await apiService.metrics.upsertMetric(stageKey, {
        key: metric.key,
        name: metric.name,
        value: parseFloat(newValue),
        target: metric.target,
        unit: metric.unit
      });
      setEditingMetric(null);
      onUpdate();
    } catch (err) {
      console.error('Error updating metric:', err);
    }
  };

  const handleAddMetric = async (metricDef) => {
    try {
      await apiService.metrics.upsertMetric(stageKey, {
        key: metricDef.key,
        name: metricDef.name,
        value: 0,
        target: metricDef.default_target,
        unit: metricDef.unit,
        source: 'manual'
      });
      setShowAddMetric(false);
      onUpdate();
    } catch (err) {
      console.error('Error adding metric:', err);
    }
  };

  const metricKeys = metrics.map(m => m.key);
  const availableMetrics = defaultMetrics?.filter(dm => !metricKeys.includes(dm.key)) || [];

  return (
    <div className="metrics-panel">
      <div className="metrics-header">
        <h3>Key Performance Indicators</h3>
        {availableMetrics.length > 0 && (
          <button 
            className="btn-primary btn-sm"
            onClick={() => setShowAddMetric(!showAddMetric)}
          >
            + Add Metric
          </button>
        )}
      </div>

      {showAddMetric && (
        <div className="add-metric-dropdown">
          <h4>Available Metrics</h4>
          {availableMetrics.map(metric => (
            <button
              key={metric.key}
              className="metric-option"
              onClick={() => handleAddMetric(metric)}
            >
              <strong>{metric.name}</strong>
              <span>{metric.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className="metrics-grid">
        {metrics.length === 0 ? (
          <div className="empty-state">
            <p>No metrics tracked yet. Add your first metric!</p>
          </div>
        ) : (
          metrics.map(metric => (
            <KpiCard
              key={metric.id}
              metric={metric}
              editable
              onEdit={() => setEditingMetric(metric.id)}
              onSave={(value) => handleUpdateMetric(metric, value)}
              isEditing={editingMetric === metric.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
