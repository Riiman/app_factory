import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaRocket, FaChartLine, FaFileAlt, FaCheckCircle, 
  FaClock, FaUsers, FaDollarSign, FaDownload 
} from 'react-icons/fa';
import './Dashboard.css';

const API_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingDoc, setGeneratingDoc] = useState(false);

  // Use useCallback to memoize the function
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/${submissionId}`);
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, [submissionId]); // Only depends on submissionId

  useEffect(() => {
    if (submissionId) {
      fetchDashboardData();
    }
  }, [submissionId, fetchDashboardData]); // Now includes fetchDashboardData

  const handleGenerateDocument = async () => {
    setGeneratingDoc(true);
    try {
      const response = await axios.post(`${API_URL}/generate-document/${submissionId}`);
      if (response.data.success) {
        alert('Document generated successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please check your Azure OpenAI configuration.');
    }
    setGeneratingDoc(false);
  };

  const handleDownloadDocument = () => {
    window.open(`${API_URL}/download-document/${submissionId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your startup dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <h2>Dashboard Not Found</h2>
        <p>Unable to load dashboard data. Please check your submission ID.</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  const { submission, progress, document_available } = dashboardData;
  const startupInfo = submission.stages['1']?.data || {};
  const mvpProgress = progress.mvp_development || {};
  const gtmProgress = progress.gtm_strategy || {};

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="startup-info">
            <h1>{startupInfo.startupName || 'Your Startup'}</h1>
            <p className="startup-stage">{startupInfo.currentStage || 'N/A'} Stage</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate('/')}>
              Home
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'mvp' ? 'active' : ''} 
          onClick={() => setActiveTab('mvp')}
        >
          MVP Development
        </button>
        <button 
          className={activeTab === 'gtm' ? 'active' : ''} 
          onClick={() => setActiveTab('gtm')}
        >
          GTM Strategy
        </button>
        <button 
          className={activeTab === 'data' ? 'active' : ''} 
          onClick={() => setActiveTab('data')}
        >
          Startup Data
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab 
            submission={submission}
            progress={progress}
            documentAvailable={document_available}
            onGenerateDocument={handleGenerateDocument}
            onDownloadDocument={handleDownloadDocument}
            generatingDoc={generatingDoc}
          />
        )}
        
        {activeTab === 'mvp' && (
          <MVPTab 
            mvpProgress={mvpProgress}
            submissionId={submissionId}
            fetchDashboardData={fetchDashboardData}
          />
        )}
        
        {activeTab === 'gtm' && (
          <GTMTab 
            gtmProgress={gtmProgress}
            submissionId={submissionId}
            fetchDashboardData={fetchDashboardData}
          />
        )}
        
        {activeTab === 'data' && (
          <DataTab submission={submission} />
        )}
      </main>
    </div>
  );
};

// Keep all the other components (OverviewTab, MVPTab, GTMTab, etc.) the same as before...
// [Previous component code remains unchanged]

export default Dashboard;
