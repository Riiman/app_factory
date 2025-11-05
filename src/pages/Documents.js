
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import './Documents.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Documents = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data.documents || []);
    } catch (error) {
      showToast('Error loading documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'general');
    formData.append('title', file.name);

    setUploading(true);
    try {
      await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      showToast('Document uploaded successfully', 'success');
      loadDocuments();
    } catch (error) {
      showToast('Error uploading document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const response = await axios.get(
        `${API_URL}/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast('Error downloading document', 'error');
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Document deleted successfully', 'success');
      loadDocuments();
    } catch (error) {
      showToast('Error deleting document', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Loading documents...</div>;
  }

  return (
    <div className="documents-page">
      <div className="documents-header">
        <h1>My Documents</h1>
        <label className="upload-button">
          {uploading ? 'Uploading...' : 'Upload Document'}
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <div className="documents-grid">
        {documents.length === 0 ? (
          <div className="empty-state">
            <p>No documents yet. Upload your first document!</p>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="document-card">
              <div className="document-icon">📄</div>
              <h3>{doc.title}</h3>
              <p className="document-type">{doc.document_type}</p>
              <p className="document-date">
                {new Date(doc.created_at).toLocaleDateString()}
              </p>
              <div className="document-actions">
                <button onClick={() => handleDownload(doc.id, doc.file_name)}>
                  Download
                </button>
                <button onClick={() => handleDelete(doc.id)} className="delete-btn">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Documents;
