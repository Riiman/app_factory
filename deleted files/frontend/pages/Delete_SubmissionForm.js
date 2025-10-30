
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../src/context/AuthContext';
import { useToast } from '../../../src/context/ToastContext';
import { ROUTES } from '../../../src/config/constants';
import apiService from '../../../src/services/api';
import './SubmissionForm.css';

const SubmissionForm = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [currentStage, setCurrentStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    stage1: {},
    stage2: {},
    stage3: {},
    stage4: {},
    stage5: {}
  });

  const stages = [
    { number: 1, title: 'Basic Information' },
    { number: 2, title: 'Problem & Solution' },
    { number: 3, title: 'Market Analysis' },
    { number: 4, title: 'Business Model' },
    { number: 5, title: 'Team & Financials' }
  ];

  useEffect(() => {
    loadSubmission();
  }, []);

  const loadSubmission = async () => {
    try {
      const response = await apiService.submissions.getCurrent();

      if (response.data.submission) {
        const submission = response.data.submission;
        setCurrentStage(submission.current_stage || 1);
        
        const stageData = {};
        submission.stages?.forEach(stage => {
          stageData[`stage${stage.stage_number}`] = stage.data;
        });
        setFormData(stageData);
      }
    } catch (error) {
      console.error('Error loading submission:', error);
    }
  };

  const handleStageChange = (stage, data) => {
    setFormData(prev => ({
      ...prev,
      [`stage${stage}`]: data
    }));
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await apiService.post(
        '/submissions/save',
        {
          stage: currentStage,
          data: formData[`stage${currentStage}`]
        }
      );

      if (currentStage < 5) {
        setCurrentStage(currentStage + 1);
        showSuccess('Progress saved!');
      } else {
        await handleSubmit();
      }
    } catch (error) {
      showError('Error saving progress');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiService.post(
        '/submissions/submit',
        {}
      );

      showSuccess('Submission completed successfully!');
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      showError('Error submitting form');
    } finally {
      setLoading(false);
    }
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case 1:
        return <Stage1 data={formData.stage1} onChange={(data) => handleStageChange(1, data)} />;
      case 2:
        return <Stage2 data={formData.stage2} onChange={(data) => handleStageChange(2, data)} />;
      case 3:
        return <Stage3 data={formData.stage3} onChange={(data) => handleStageChange(3, data)} />;
      case 4:
        return <Stage4 data={formData.stage4} onChange={(data) => handleStageChange(4, data)} />;
      case 5:
        return <Stage5 data={formData.stage5} onChange={(data) => handleStageChange(5, data)} />;
      default:
        return null;
    }
  };

  return (
    <div className="submission-form">
      <div className="form-header">
        <h1>Startup Evaluation Form</h1>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStage / 5) * 100}%` }}
          />
        </div>
        <div className="stage-indicators">
          {stages.map(stage => (
            <div 
              key={stage.number}
              className={`stage-indicator ${currentStage >= stage.number ? 'active' : ''}`}
            >
              <span className="stage-number">{stage.number}</span>
              <span className="stage-title">{stage.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-content">
        {renderStageContent()}
      </div>

      <div className="form-navigation">
        <button 
          onClick={handlePrevious} 
          disabled={currentStage === 1 || loading}
          className="nav-button prev-button"
        >
          Previous
        </button>
        <button 
          onClick={handleNext} 
          disabled={loading}
          className="nav-button next-button"
        >
          {loading ? 'Saving...' : currentStage === 5 ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
};

// Stage 1: Basic Information
const Stage1 = ({ data, onChange }) => {
  const [formData, setFormData] = useState(data || {
    startupName: '',
    industry: '',
    location: '',
    website: '',
    foundedDate: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="stage-form">
      <h2>Basic Information</h2>
      <div className="form-group">
        <label>Startup Name *</label>
        <input
          type="text"
          name="startupName"
          value={formData.startupName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Industry *</label>
        <input
          type="text"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Location *</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Website</label>
        <input
          type="url"
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="https://example.com"
        />
      </div>
      <div className="form-group">
        <label>Founded Date</label>
        <input
          type="date"
          name="foundedDate"
          value={formData.foundedDate}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label>Brief Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Describe your startup in a few sentences"
        />
      </div>
    </div>
  );
};

// Stage 2: Problem & Solution
const Stage2 = ({ data, onChange }) => {
  const [formData, setFormData] = useState(data || {
    problem: '',
    solution: '',
    uniqueValue: '',
    targetCustomer: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="stage-form">
      <h2>Problem & Solution</h2>
      <div className="form-group">
        <label>What problem are you solving? *</label>
        <textarea
          name="problem"
          value={formData.problem}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Describe the problem your startup addresses"
        />
      </div>
      <div className="form-group">
        <label>What is your solution? *</label>
        <textarea
          name="solution"
          value={formData.solution}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Explain how your product/service solves the problem"
        />
      </div>
      <div className="form-group">
        <label>What is your unique value proposition? *</label>
        <textarea
          name="uniqueValue"
          value={formData.uniqueValue}
          onChange={handleChange}
          rows="4"
          required
          placeholder="What makes your solution different from competitors?"
        />
      </div>
      <div className="form-group">
        <label>Target Customer *</label>
        <textarea
          name="targetCustomer"
          value={formData.targetCustomer}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Who are your ideal customers?"
        />
      </div>
    </div>
  );
};

// Stage 3: Market Analysis
const Stage3 = ({ data, onChange }) => {
  const [formData, setFormData] = useState(data || {
    marketSize: '',
    marketGrowth: '',
    competition: '',
    competitiveAdvantage: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="stage-form">
      <h2>Market Analysis</h2>
      <div className="form-group">
        <label>Market Size *</label>
        <textarea
          name="marketSize"
          value={formData.marketSize}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Describe the total addressable market"
        />
      </div>
      <div className="form-group">
        <label>Market Growth Rate *</label>
        <textarea
          name="marketGrowth"
          value={formData.marketGrowth}
          onChange={handleChange}
          rows="4"
          required
          placeholder="What is the growth rate of your market?"
        />
      </div>
      <div className="form-group">
        <label>Key Competitors *</label>
        <textarea
          name="competition"
          value={formData.competition}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Identify main competitors and their strengths/weaknesses"
        />
      </div>
      <div className="form-group">
        <label>Your Competitive Advantage *</label>
        <textarea
          name="competitiveAdvantage"
          value={formData.competitiveAdvantage}
          onChange={handleChange}
          rows="4"
          required
          placeholder="What sets you apart from competitors?"
        />
      </div>
    </div>
  );
};

// Stage 4: Business Model
const Stage4 = ({ data, onChange }) => {
  const [formData, setFormData] = useState(data || {
    revenueModel: '',
    pricingStrategy: '',
    salesChannels: '',
    customerAcquisition: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="stage-form">
      <h2>Business Model</h2>
      <div className="form-group">
        <label>Revenue Model *</label>
        <textarea
          name="revenueModel"
          value={formData.revenueModel}
          onChange={handleChange}
          rows="4"
          required
          placeholder="How will your startup make money?"
        />
      </div>
      <div className="form-group">
        <label>Pricing Strategy *</label>
        <textarea
          name="pricingStrategy"
          value={formData.pricingStrategy}
          onChange={handleChange}
          rows="4"
          required
          placeholder="How will you price your products/services?"
        />
      </div>
      <div className="form-group">
        <label>Sales Channels *</label>
        <textarea
          name="salesChannels"
          value={formData.salesChannels}
          onChange={handleChange}
          rows="4"
          required
          placeholder="How will you reach customers?"
        />
      </div>
      <div className="form-group">
        <label>Customer Acquisition Strategy *</label>
        <textarea
          name="customerAcquisition"
          value={formData.customerAcquisition}
          onChange={handleChange}
          rows="4"
          required
          placeholder="How will you attract and retain customers?"
        />
      </div>
    </div>
  );
};

// Stage 5: Team & Financials
const Stage5 = ({ data, onChange }) => {
  const [formData, setFormData] = useState(data || {
    teamMembers: '',
    advisors: '',
    fundingStatus: '',
    financialProjections: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="stage-form">
      <h2>Team & Financials</h2>
      <div className="form-group">
        <label>Key Team Members *</label>
        <textarea
          name="teamMembers"
          value={formData.teamMembers}
          onChange={handleChange}
          rows="4"
          required
          placeholder="List key team members and their roles"
        />
      </div>
      <div className="form-group">
        <label>Advisors *</label>
        <textarea
          name="advisors"
          value={formData.advisors}
          onChange={handleChange}
          rows="4"
          required
          placeholder="List advisors and their expertise"
        />
      </div>
      <div className="form-group">
        <label>Funding Status *</label>
        <textarea
          name="fundingStatus"
          value={formData.fundingStatus}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Current funding status and plans"
        />
      </div>
      <div className="form-group">
        <label>Financial Projections *</label>
        <textarea
          name="financialProjections"
          value={formData.financialProjections}
          onChange={handleChange}
          rows="4"
          required
          placeholder="Revenue projections for next 3-5 years"
        />
      </div>
    </div>
  );
};

export default SubmissionForm;
