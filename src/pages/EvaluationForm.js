import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EvaluationForm.css';

const API_URL = 'http://localhost:5000/api';

const STAGES = [
  {
    id: 1,
    title: 'General Information',
    fields: [
      { name: 'startupName', label: 'Startup Name', type: 'text', required: true },
      { name: 'websiteUrl', label: 'Website or Product URL', type: 'url', required: false },
      { name: 'foundingYear', label: 'Founding Year', type: 'number', required: true },
      { 
        name: 'currentStage', 
        label: 'Current Stage', 
        type: 'select', 
        options: ['Idea', 'Prototype', 'MVP', 'Revenue-Generating'],
        required: true 
      },
      { name: 'numberOfFounders', label: 'Number of Founders', type: 'number', required: true },
      { name: 'teamMembers', label: 'Number of Team Members', type: 'number', required: true },
      { name: 'headquarters', label: 'Headquarters Location', type: 'text', required: true },
      { name: 'founderLinkedIn', label: 'LinkedIn Profile of Founders', type: 'url', required: false },
      { name: 'companyOverview', label: 'Brief Company Overview (Max 200 words)', type: 'textarea', required: true, maxLength: 200 }
    ]
  },
  {
    id: 2,
    title: 'Problem & Solution',
    fields: [
      { name: 'problemStatement', label: 'What specific problem or pain point are you solving?', type: 'textarea', required: true },
      { name: 'targetAudience', label: 'Who experiences this problem most acutely?', type: 'textarea', required: true },
      { name: 'currentSolutions', label: 'How are these problems being solved currently (existing solutions)?', type: 'textarea', required: true },
      { name: 'valueProposition', label: 'What is your unique value proposition?', type: 'textarea', required: true },
      { name: 'coreInnovation', label: 'What is the core innovation or differentiation in your solution?', type: 'textarea', required: true },
      { name: 'timing', label: 'Why is now the right time for your product or service?', type: 'textarea', required: true }
    ]
  },
  {
    id: 3,
    title: 'Product & Technology',
    fields: [
      { name: 'productDescription', label: 'Describe your product or platform in detail', type: 'textarea', required: true },
      { name: 'productType', label: 'Is your product AI-driven, SaaS-based, or hybrid?', type: 'text', required: true },
      { name: 'technologiesUsed', label: 'Please specify technologies used', type: 'textarea', required: true },
      { name: 'developmentStage', label: 'What stage of development is your product currently in?', type: 'text', required: true },
      { name: 'technicalComponents', label: 'What are the key technical components or architecture?', type: 'textarea', required: true },
      { name: 'mvpLink', label: 'Do you have a live MVP or prototype? (Provide link or demo if available)', type: 'url', required: false },
      { name: 'techStack', label: 'What technology stack (frontend, backend, infrastructure) are you using?', type: 'textarea', required: true },
      { name: 'aiMlComponents', label: 'Have you implemented any automation, AI, or ML components?', type: 'textarea', required: true },
      { name: 'technicalGoals', label: 'What are your short-term technical development goals?', type: 'textarea', required: true },
      { name: 'technicalChallenges', label: 'What are the biggest technical challenges you are facing?', type: 'textarea', required: true }
    ]
  },
  {
    id: 4,
    title: 'Market & Competition',
    fields: [
      { name: 'targetMarket', label: 'What is your target market or customer segment?', type: 'textarea', required: true },
      { name: 'marketSize', label: 'What is the estimated market size (TAM/SAM/SOM)?', type: 'textarea', required: true },
      { name: 'customerReach', label: 'How do you plan to reach your target customers?', type: 'textarea', required: true },
      { name: 'competitors', label: 'Who are your top 3 competitors?', type: 'textarea', required: true },
      { name: 'differentiation', label: 'How are you different from your competitors?', type: 'textarea', required: true },
      { name: 'barriers', label: 'What are the major barriers to entry in your market?', type: 'textarea', required: true },
      { name: 'earlyAdopters', label: 'Have you identified early adopters or pilot customers?', type: 'textarea', required: true }
    ]
  },
  {
    id: 5,
    title: 'Business Model & Revenue',
    fields: [
      { name: 'businessModel', label: 'What is your business model?', type: 'select', options: ['B2B', 'B2C', 'B2B2C', 'Subscription', 'Transaction-based', 'Other'], required: true },
      { name: 'currentRevenue', label: 'How do you generate revenue currently?', type: 'textarea', required: true },
      { name: 'revenueStreams', label: 'What are your main revenue streams?', type: 'textarea', required: true },
      { name: 'pricingStrategy', label: 'What is your pricing strategy?', type: 'textarea', required: true },
      { name: 'willingnessToPay', label: 'Have you validated your willingness-to-pay among users?', type: 'textarea', required: true },
      { name: 'cac', label: 'What is your customer acquisition cost (CAC)?', type: 'text', required: false },
      { name: 'ltv', label: 'What is your customer lifetime value (LTV)?', type: 'text', required: false },
      { name: 'revenueScale', label: 'How do you plan to scale your revenue model in the next 12 months?', type: 'textarea', required: true }
    ]
  },
  {
    id: 6,
    title: 'Traction & Metrics',
    fields: [
      { name: 'activeUsers', label: 'How many active users or paying customers do you have currently?', type: 'text', required: true },
      { name: 'keyMetrics', label: 'What key metrics are you tracking (e.g., MAU, DAU, churn, retention, etc.)?', type: 'textarea', required: true },
      { name: 'fundingRaised', label: 'Have you raised any funding so far? If yes, from whom and how much?', type: 'textarea', required: true },
      { name: 'acceleratorExperience', label: 'Have you participated in any accelerator or incubator program before?', type: 'textarea', required: true },
      { name: 'milestones', label: 'What milestones have you achieved so far?', type: 'textarea', required: true },
      { name: 'nextMilestones', label: 'What are your next key milestones (next 6-12 months)?', type: 'textarea', required: true }
    ]
  },
  {
    id: 7,
    title: 'Team & Capabilities',
    fields: [
      { name: 'founderBackground', label: 'Please describe the background of each founder (technical, business, domain expertise)', type: 'textarea', required: true },
      { name: 'teamRoles', label: 'Who handles product development, marketing, and operations?', type: 'textarea', required: true },
      { name: 'priorExperience', label: 'Does the team have prior startup or industry experience?', type: 'textarea', required: true },
      { name: 'skillGaps', label: 'What skill gaps currently exist in your team?', type: 'textarea', required: true },
      { name: 'lookingFor', label: 'Are you looking for co-founders, advisors, or specific technical expertise?', type: 'textarea', required: true }
    ]
  },
  {
    id: 8,
    title: 'Support Requirements from Turning Ideas',
    fields: [
      { 
        name: 'supportTypes', 
        label: 'What kind of support are you looking for from the incubator? (Select all that apply)', 
        type: 'checkbox', 
        options: [
          'Technical Development (MVP, Architecture, Scaling)',
          'Product Design and UI/UX',
          'Business Strategy and GTM Planning',
          'Fundraising and Investor Connections',
          'Mentorship and Advisory',
          'Hiring Support'
        ],
        required: true 
      },
      { name: 'technicalSupport', label: 'Do you require technical infrastructure or developer support?', type: 'textarea', required: true },
      { name: 'validationSupport', label: 'Would you like Turning Ideas to help with validation, pilots, or partnerships?', type: 'textarea', required: true },
      { name: 'shortTermGoals', label: 'What are your short-term goals during the incubation period?', type: 'textarea', required: true },
      { name: 'expectedOutcomes', label: 'What outcomes do you expect from this incubation program?', type: 'textarea', required: true }
    ]
  }
];

const EvaluationForm = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [formData, setFormData] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Initialize form data for current stage
    const stage = STAGES[currentStage];
    const initialData = {};
    stage.fields.forEach(field => {
      if (field.type === 'checkbox') {
        initialData[field.name] = [];
      } else {
        initialData[field.name] = '';
      }
    });
    setFormData(prev => ({ ...prev, ...initialData }));
  }, [currentStage]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => {
        const currentValues = prev[name] || [];
        if (checked) {
          return { ...prev, [name]: [...currentValues, value] };
        } else {
          return { ...prev, [name]: currentValues.filter(v => v !== value) };
        }
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStage = () => {
    const stage = STAGES[currentStage];
    const newErrors = {};
    
    stage.fields.forEach(field => {
      if (field.required) {
        if (field.type === 'checkbox') {
          if (!formData[field.name] || formData[field.name].length === 0) {
            newErrors[field.name] = 'Please select at least one option';
          }
        } else if (!formData[field.name] || formData[field.name].trim() === '') {
          newErrors[field.name] = 'This field is required';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveStage = async () => {
    if (!validateStage()) {
      return false;
    }

    setIsSubmitting(true);
    try {
      const stageData = {};
      STAGES[currentStage].fields.forEach(field => {
        stageData[field.name] = formData[field.name];
      });

      const response = await axios.post(`${API_URL}/submit-stage`, {
        submission_id: submissionId,
        stage: currentStage + 1,
        data: stageData
      });

      if (response.data.success && !submissionId) {
        setSubmissionId(response.data.submission_id);
      }

      setIsSubmitting(false);
      return true;
    } catch (error) {
      console.error('Error saving stage:', error);
      alert('Error saving data. Please try again.');
      setIsSubmitting(false);
      return false;
    }
  };

  const handleNext = async () => {
    const saved = await saveStage();
    if (saved && currentStage < STAGES.length - 1) {
      setCurrentStage(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStage > 0) {
      setCurrentStage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    const saved = await saveStage();
    if (!saved) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/submit-final`, {
        submission_id: submissionId
      });

      if (response.data.success) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    }
    setIsSubmitting(false);
  };

  const renderField = (field) => {
    const fieldError = errors[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label} {field.required && <span className="required">*</span>}</label>
            <textarea
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              rows={4}
              className={fieldError ? 'error' : ''}
            />
            {fieldError && <span className="error-message">{fieldError}</span>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label} {field.required && <span className="required">*</span>}</label>
            <select
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              className={fieldError ? 'error' : ''}
            >
              <option value="">Select an option</option>
              {field.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {fieldError && <span className="error-message">{fieldError}</span>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label} {field.required && <span className="required">*</span>}</label>
            <div className="checkbox-group">
              {field.options.map(option => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={option}
                    checked={(formData[field.name] || []).includes(option)}
                    onChange={handleInputChange}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {fieldError && <span className="error-message">{fieldError}</span>}
          </div>
        );

      default:
        return (
          <div key={field.name} className="form-field">
            <label>{field.label} {field.required && <span className="required">*</span>}</label>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              className={fieldError ? 'error' : ''}
            />
            {fieldError && <span className="error-message">{fieldError}</span>}
          </div>
        );
    }
  };

  if (showSuccess) {
    return (
      <div className="evaluation-form">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h1>Application Submitted Successfully!</h1>
          <p>Thank you for applying to Turning Ideas App Factory.</p>
          <p>Your submission ID is: <strong>{submissionId}</strong></p>
          <p>Our team will review your application and get back to you within 5-7 business days.</p>
          <button onClick={() => window.location.href = '/'} className="back-home-btn">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const stage = STAGES[currentStage];
  const progress = ((currentStage + 1) / STAGES.length) * 100;

  return (
    <div className="evaluation-form">
      <div className="form-header">
        <h1>Startup Evaluation Form</h1>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="stage-info">Stage {currentStage + 1} of {STAGES.length}: {stage.title}</p>
      </div>

      <div className="form-container">
        <h2>{stage.title}</h2>
        <form>
          {stage.fields.map(field => renderField(field))}
        </form>

        <div className="form-navigation">
          {currentStage > 0 && (
            <button onClick={handlePrevious} className="nav-btn prev-btn">
              ← Previous
            </button>
          )}
          
          {currentStage < STAGES.length - 1 ? (
            <button 
              onClick={handleNext} 
              className="nav-btn next-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Next →'}
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              className="nav-btn submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationForm;
