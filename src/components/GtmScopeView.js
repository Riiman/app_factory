import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const GtmScopeView = ({ startupId }) => {
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGtmScope = async () => {
      if (!startupId) {
        setError('Startup ID is required to fetch GTM scope.');
        setLoading(false);
        return;
      }
      try {
        // Assuming an API endpoint like /api/platform/startups/{startupId}/gtm-scope
        // We need to verify this in api.js or create a new one if it doesn't exist
        const response = await apiService.platform.getGtmScope(startupId);
        if (response.data.success) {
          setScope(response.data.data);
        } else {
          setError(response.data.error || 'Failed to fetch GTM scope.');
        }
      } catch (err) {
        setError(err);
      }
      setLoading(false);
    };

    fetchGtmScope();
  }, [startupId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    if (error.response && error.response.status === 404) {
      return <div style={{ padding: '16px', color: '#757575' }}>GTM Scope: Under Process</div>;
    }
    return <div style={{ color: '#F44336', padding: '16px' }}>Error: {error}</div>;
  }

  if (!scope) {
    return <div style={{ padding: '16px', color: '#757575' }}>GTM Scope: Under Process</div>;
  }

  return (
    <div style={{ padding: '16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', backgroundColor: '#ffffff' }}>
      <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>GTM Scope Details</h4>
      <p style={{ marginBottom: '8px' }}><strong>Status:</strong> {scope.status}</p>
      
      <div style={{ marginTop: '24px' }}>
        <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }}>Ideal Customer Profile (ICP):</h5>
        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '16px' }}>{scope.icp}</p>

        <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }}>Target Geographies:</h5>
        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '16px' }}>{scope.target_geographies}</p>

        <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }}>Channels:</h5>
        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '16px' }}>{scope.channels}</p>

        <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }}>Positioning Statement:</h5>
        <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '16px' }}>{scope.positioning_statement}</p>
      </div>
    </div>
  );
};

export default GtmScopeView;

