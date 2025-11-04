import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const StartupStatus = {
  ACTIVE: 'active',
  SCOPE_APPROVED: 'scope_approved',
  CONTRACT_SIGNED: 'contract_signed',
  IN_COHORT: 'in_cohort',
  GRADUATED: 'graduated',
  DROPPED: 'dropped',
  UNDER_REVIEW: 'under_review', // Added UNDER_REVIEW status
};

const PlatformStartups = () => {
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const response = await api.get('/platform/startups-with-metrics');
        if (response.data.success && Array.isArray(response.data.data)) {
          setStartups(response.data.data);
        } else {
          setError(response.data.error || 'Failed to fetch startups');
        }
      } catch (err) {
        console.error('Error fetching startups:', err);
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    };

    fetchStartups();
  }, []);

  const handleViewProductScope = (startupId) => {
    navigate(`/platform/scope/${startupId}`);
  };

  const handleViewGtmScope = (startupId) => {
    navigate(`/platform/gtm-scope/${startupId}`);
  };

  const handleStatusChange = async (startupId, newStatus) => {
    try {
      const response = await api.put(`/platform/startups/${startupId}/status`, { status: newStatus });
      if (response.data.success) {
        setStartups(startups.map(s => s.id === startupId ? { ...s, status: newStatus } : s));
      } else {
        console.error('Failed to update startup status');
      }
    } catch (err) {
      console.error('Error updating startup status:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div style={{ borderColor: '#ccc', borderRightColor: 'transparent', borderWidth: '3px', borderStyle: 'solid', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginLeft: '8px', fontSize: '1.25rem' }}>Loading startups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '16px' }}>
        <p style={{ color: '#F44336' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '24px' }}>Startups</h1>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>Startup Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>Overall Progress</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>GTM Scope Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid #eeeeee' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {startups.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#757575' }}>No startups found.</td>
              </tr>
            ) : (
              startups.map((startup) => (
                <tr key={startup.id} style={{ borderBottom: '1px solid #eeeeee' }}>
                  <td style={{ padding: '12px 16px' }}>{startup.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={startup.status}
                      onChange={(e) => handleStatusChange(startup.id, e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        minWidth: '150px',
                      }}
                    >
                      {Object.values(StartupStatus).map(status => (
                        <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{startup.overall_progress ? `${startup.overall_progress.toFixed(2)}%` : 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {startup.gtm_scope ? startup.gtm_scope.status.replace('_', ' ').toUpperCase() : 'Not Defined'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleViewProductScope(startup.id)}
                      style={{
                        backgroundColor: '#e0e0e0',
                        color: '#333',
                        padding: '8px 12px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        marginRight: '8px',
                      }}
                    >
                      View Product Scope
                    </button>
                    <button
                      onClick={() => handleViewGtmScope(startup.id)}
                      style={{
                        backgroundColor: '#e0e0e0',
                        color: '#333',
                        padding: '8px 12px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      View GTM Scope
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlatformStartups;
