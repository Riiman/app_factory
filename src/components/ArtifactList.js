import React, { useState } from 'react';
import apiService from '../services/api';
import './ArtifactList.css';

const ArtifactList = ({ stageKey, artifacts, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'link',
    url: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.artifacts.createArtifact(stageKey, formData);
      setFormData({ title: '', type: 'link', url: '', description: '' });
      setShowAddForm(false);
      onUpdate();
    } catch (err) {
      console.error('Error creating artifact:', err);
    }
  };

  const getArtifactIcon = (type) => {
    const icons = {
      document: '📄',
      link: '🔗',
      file: '📎',
      code_repo: '💻',
      design: '🎨',
      video: '🎥'
    };
    return icons[type] || '📎';
  };

  return (
    <div className="artifact-list">
      <div className="artifact-header">
        <h3>Files & Links</h3>
        <button 
          className="btn-primary btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + Add Artifact
        </button>
      </div>

      {showAddForm && (
        <form className="add-artifact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="link">Link</option>
            <option value="document">Document</option>
            <option value="file">File</option>
            <option value="code_repo">Code Repository</option>
            <option value="design">Design</option>
            <option value="video">Video</option>
          </select>
          <input
            type="url"
            placeholder="URL"
            value={formData.url}
            onChange={(e) => setFormData({...formData, url: e.target.value})}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">Add</button>
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="artifacts-grid">
        {artifacts.length === 0 ? (
          <div className="empty-state">
            <p>No artifacts yet. Add your first file or link!</p>
          </div>
        ) : (
          artifacts.map(artifact => (
            <div key={artifact.id} className="artifact-card">
              <span className="artifact-icon">{getArtifactIcon(artifact.type)}</span>
              <div className="artifact-info">
                <h4>{artifact.title}</h4>
                {artifact.description && <p>{artifact.description}</p>}
                <div className="artifact-meta">
                  <span className="artifact-type">{artifact.type}</span>
                  {artifact.version && <span>v{artifact.version}</span>}
                </div>
                {artifact.url && (
                  <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="artifact-link">
                    Open →
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArtifactList;
