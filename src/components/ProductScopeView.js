import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const ProductScopeView = ({ startupId }) => {
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScope = async () => {
      if (!startupId) {
        setError('Startup ID is required to fetch product scope.');
        setLoading(false);
        return;
      }
      try {
        // Assuming an API endpoint like /api/platform/startups/{startupId}/product-scope
        // We need to verify this in api.js or create a new one if it doesn't exist
        const response = await apiService.platform.getProductScope(startupId);
        if (response.data.success) {
          setScope(response.data.data);
        } else {
          setError(response.data.error || 'Failed to fetch product scope.');
        }
      } catch (err) {
        setError(err);
      }
      setLoading(false);
    };

    fetchScope();
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
      return <div style={{ padding: '16px', color: '#757575' }}>Product Scope: Under Process</div>;
    }
    return <div style={{ color: '#F44336', padding: '16px' }}>Error: {error}</div>;
  }

  if (!scope) {
    return <div style={{ padding: '16px', color: '#757575' }}>Product Scope: Under Process</div>;
  }

  return (
    <div style={{ padding: '16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', backgroundColor: '#ffffff' }}>
      <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Product Scope Details</h4>
      <p style={{ marginBottom: '8px' }}><strong>Status:</strong> {scope.status}</p>
      
      <div style={{ marginTop: '24px' }}>
        <h5 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }}>Features:</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {scope.features.map(feature => (
            <div key={feature.id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
              <h6 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>{feature.title}</h6>
              <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '8px' }}>{feature.description}</p>
              <p style={{ fontSize: '0.8rem', color: '#777' }}><strong>Priority:</strong> {feature.priority}</p>
              
              {feature.comments && feature.comments.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Comments:</p>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                    {feature.comments.map((c, i) => (
                      <li key={i} style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductScopeView;
