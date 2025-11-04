import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const submissionStatuses = ['pending', 'in_progress', 'reviewed'];

const PlatformSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState(['pending']); // Default to pending
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusQuery = selectedStatuses.length > 0 ? selectedStatuses.join(',') : '';
        console.log('Frontend: Sending status query:', statusQuery); // <--- Added this line
        const response = await apiService.platform.getSubmissions(statusQuery ? { status: statusQuery } : {});
        if (response.data.success && Array.isArray(response.data.submissions)) {
          setSubmissions(response.data.submissions);
        } else {
          setError(response.data.error || 'Failed to fetch submissions');
        }
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [selectedStatuses]); // Re-fetch when selectedStatuses change

  const handleViewSubmission = (submissionId) => {
    navigate(`/platform/evaluation/${submissionId}`);
  };

  const handleStatusFilterChange = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const getStatusBadge = (status) => {
    let backgroundColor = '#e0e0e0'; // default grey
    let color = '#333';
    if (status === 'pending') {
      backgroundColor = '#fff3e0'; // warning light orange
      color = '#f57c00'; // warning orange
    } else if (status === 'in_progress') {
      backgroundColor = '#e3f2fd'; // info light blue
      color = '#1976d2'; // info blue
    } else if (status === 'reviewed') {
      backgroundColor = '#e8f5e9'; // success light green
      color = '#388e3c'; // success green
    }
    return (
      <span
        style={{
          backgroundColor,
          color,
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
        }}
      >
        {status}
      </span>
    );
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
        <p style={{ marginLeft: '8px', fontSize: '1.25rem' }}>Loading submissions...</p>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 'bold',
            backgroundImage: 'linear-gradient(45deg, #1976D2 30%, #673AB7 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Submissions for Review
          </h1>
          <p style={{ color: '#616161', fontSize: '1rem', margin: '4px 0 0 0' }}>Review and manage startup submissions</p>
        </div>
        <button style={{
          backgroundColor: '#1976D2',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '5px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          backgroundImage: 'linear-gradient(45deg, #1976D2 30%, #673AB7 90%)',
        }}>
          Export Data
        </button>
      </div>

      {/* Status Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {submissionStatuses.map((status) => (
          <label key={status} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedStatuses.includes(status)}
              onChange={() => handleStatusFilterChange(status)}
              style={{ marginRight: '8px' }}
            />
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </label>
        ))}
      </div>

      {/* Submission Cards/Table - Simplified for now */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>Startup Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eeeeee' }}>Submitted At</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid #eeeeee' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#757575' }}>No submissions found for the selected filters.</td>
              </tr>
            ) : (
              submissions.map((submission) => (
                <tr key={submission.id} style={{ borderBottom: '1px solid #eeeeee' }}>
                  <td style={{ padding: '12px 16px' }}>{submission.startup_name}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(submission.status)}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(submission.submitted_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleViewSubmission(submission.id)}
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
                      Evaluate
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

export default PlatformSubmissions;