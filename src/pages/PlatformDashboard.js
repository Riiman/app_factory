import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

// lucide-react icons
import {
  FileText as SubmissionsIcon,
  Rocket as StartupsIcon,
  ArrowUpRight as ArrowUpwardIcon,
  ArrowDownRight as ArrowDownwardIcon,
  Clock as ClockIcon,
  CheckCircle2 as CheckCircleOutlineIcon,
} from 'lucide-react';

const StatCard = ({ title, value, change, changeType, description, icon, gradient }) => (
  <div style={{
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  }}>
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: gradient,
    }} />
    <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h3 style={{ fontSize: '1rem', color: '#616161', margin: '0 0 4px 0' }}>{title}</h3>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>{value}</p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: changeType === 'increase' ? '#4CAF50' : '#F44336',
          fontSize: '0.875rem',
        }}>
          {changeType === 'increase' ? <ArrowUpwardIcon size={16} /> : <ArrowDownwardIcon size={16} />}
          <span style={{ marginLeft: '4px' }}>{change}</span>
          <span style={{ marginLeft: '8px', color: '#757575' }}>{description}</span>
        </div>
      </div>
      <div style={{
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        background: gradient,
        color: 'white',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        marginTop: '-24px',
      }}>
        {icon}
      </div>
    </div>
  </div>
);

const PlatformDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await api.get('/platform/submissions');
        if (response.data.success && Array.isArray(response.data.submissions)) {
          setSubmissions(response.data.submissions);
        } else {
          setError(response.data.error || 'Failed to fetch submissions');
        }
      } catch (err) {
        console.error('Error fetching platform dashboard submissions:', err);
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    };

    const fetchStartups = async () => {
      try {
        const response = await api.get('/platform/startups-with-metrics');
        if (response.data.success && Array.isArray(response.data.data)) {
          setStartups(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching startups:', err);
      }
    };

    fetchSubmissions();
    fetchStartups();
  }, []);

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
        <p style={{ marginLeft: '8px', fontSize: '1.25rem' }}>Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '960px', margin: '32px auto', padding: '24px', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#F44336', marginBottom: '16px' }}>⚠️ Error Loading Dashboard</h2>
        <p style={{ fontSize: '1rem', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#1976D2',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >Retry</button>
      </div>
    );
  }

  const recentSubmissions = submissions.slice(0, 4);

  const approvedThisMonth = startups.filter(startup => {
    const createdAt = new Date(startup.created_at);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  const statsData = [
    {
      title: "Total Submissions",
      value: submissions.length,
      change: "+12.5%",
      changeType: "increase",
      description: "from last month",
      icon: <SubmissionsIcon size={24} />,
      gradient: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
    },
    {
      title: "Pending Reviews",
      value: submissions.filter(s => s.status === 'pending').length,
      change: "+8.3%",
      changeType: "increase",
      description: "awaiting action",
      icon: <ClockIcon size={24} />,
      gradient: "linear-gradient(45deg, #FFC107 30%, #FF9800 90%)",
    },
    {
      title: "Active Startups",
      value: startups.length,
      change: "+15.2%",
      changeType: "increase",
      description: "from last month",
      icon: <StartupsIcon size={24} />,
      gradient: "linear-gradient(45deg, #9C27B0 30%, #E040FB 90%)",
    },
    {
      title: "Approved This Month",
      value: approvedThisMonth,
      change: "+23.1%",
      changeType: "increase",
      description: "from last month",
      icon: <CheckCircleOutlineIcon size={24} />,
      gradient: "linear-gradient(45deg, #4CAF50 30%, #81C784 90%)",
    },
  ];

  return (
    <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 'bold',
          backgroundImage: 'linear-gradient(45deg, #1976D2 30%, #673AB7 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          Dashboard Overview
        </h1>
        <p style={{ color: '#616161', fontSize: '1rem', margin: '4px 0 0 0' }}>Welcome back! Here's what's happening with VentureX today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {statsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '32px' }}>
        <div style={{ flex: '3', minWidth: '400px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', margin: 0 }}>Recent Submissions</h2>
          <p style={{ color: '#616161', fontSize: '0.875rem', marginBottom: '16px', margin: '4px 0 16px 0' }}>Latest startup submissions awaiting review</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recentSubmissions.map((submission) => (
              <li key={submission.id} style={{ marginBottom: '8px' }}>
                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #eeeeee',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#efefef' },
                }}>
                  <div style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: submission.status === 'approved' ? '#e8f5e9' : submission.status === 'pending' ? '#fff3e0' : '#e3f2fd',
                      color: submission.status === 'approved' ? '#388e3c' : submission.status === 'pending' ? '#f57c00' : '#1976d2',
                  }}>
                    <StartupsIcon size={20} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>{submission.startup_name}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#757575' }}>Status: {submission.status}</p>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#757575' }}>
                    {new Date(submission.submitted_at).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ flex: '2', minWidth: '300px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', margin: 0 }}>Upcoming Milestones</h2>
          <p style={{ color: '#616161', fontSize: '0.875rem', margin: '4px 0 16px 0' }}>No upcoming milestones for now.</p>
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;