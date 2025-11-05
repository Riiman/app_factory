import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Import the DEFAULT export 'apiService'
import apiService from '../services/api';
import './EvaluationForm.css';

// Form Stages Configuration
const STAGES = [
  {
    title: "Basic Information",
    fields: [
      { name: "startup_name", label: "Startup Name", type: "text", required: true },
      { name: "founder_name", label: "Founder Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone Number", type: "tel", required: true },
      { name: "location", label: "Location", type: "text", required: true },
      { name: "website", label: "Website (if any)", type: "url", required: false }
    ]
  },
  {
    title: "Business Concept",
    fields: [
      { 
        name: "problem_statement", 
        label: "What problem are you solving?", 
        type: "textarea", 
        required: true,
        placeholder: "Describe the problem your startup addresses..."
      },
      { 
        name: "solution", 
        label: "Describe your solution", 
        type: "textarea", 
        required: true,
        placeholder: "Explain how your product/service solves the problem..."
      },
      { 
        name: "target_market", 
        label: "Who is your target market?", 
        type: "textarea", 
        required: true,
        placeholder: "Define your ideal customer and market segment..."
      },
      { 
        name: "unique_value", 
        label: "What makes your solution unique?", 
        type: "textarea", 
        required: true,
        placeholder: "Explain your unique value proposition..."
      }
    ]
  },
  {
    title: "Market Analysis",
    fields: [
      { 
        name: "market_size", 
        label: "Estimated Market Size", 
        type: "text", 
        required: true,
        placeholder: "e.g., $500M TAM, $100M SAM"
      },
      { 
        name: "competitors", 
        label: "Who are your main competitors?", 
        type: "textarea", 
        required: true,
        placeholder: "List your top 3-5 competitors and their strengths..."
      },
      { 
        name: "competitive_advantage", 
        label: "Your competitive advantage", 
        type: "textarea", 
        required: true,
        placeholder: "What gives you an edge over competitors?"
      },
      { 
        name: "industry", 
        label: "Industry", 
        type: "select", 
        required: true,
        options: [
          "SaaS/Software",
          "AI/Machine Learning",
          "FinTech",
          "HealthTech",
          "EdTech",
          "E-commerce",
          "Enterprise Software",
          "Consumer Apps",
          "Other"
        ]
      }
    ]
  },
  {
    title: "Business Model",
    fields: [
      { 
        name: "revenue_model", 
        label: "How will you make money?", 
        type: "textarea", 
        required: true,
        placeholder: "Describe your revenue streams and monetization strategy..."
      },
      { 
        name: "pricing_strategy", 
        label: "Pricing Strategy", 
        type: "textarea", 
        required: true,
        placeholder: "Explain your pricing model and tiers..."
      },
      { 
        name: "customer_acquisition", 
        label: "Customer Acquisition Strategy", 
        type: "textarea", 
        required: true,
        placeholder: "How will you acquire and retain customers?"
      },
      { 
        name: "funding_stage", 
        label: "Current Funding Stage", 
        type: "select", 
        required: true,
        options: [
          "Pre-seed",
          "Seed",
          "Series A",
          "Series B",
          "Series C+",
          "Bootstrapped",
          "Not yet funded"
        ]
      },
      { 
        name: "funding_raised", 
        label: "Total Funding Raised (if any)", 
        type: "text", 
        required: false,
        placeholder: "e.g., $500K"
      }
    ]
  },
  {
    title: "Team & Resources",
    fields: [
      { 
        name: "team_size", 
        label: "Current Team Size", 
        type: "number", 
        required: true,
        placeholder: "Number of team members"
      },
      { 
        name: "key_team_members", 
        label: "Key Team Members & Roles", 
        type: "textarea", 
        required: true,
        placeholder: "List founders and key team members with their roles and backgrounds..."
      },
      { 
        name: "technical_skills", 
        label: "Technical Skills Available in Team", 
        type: "checkbox", 
        required: true,
        options: [
          "Full-Stack Development",
          "Frontend Development",
          "Backend Development",
          "Mobile Development",
          "Data Science/ML",
          "UI/UX Design",
          "DevOps",
          "Product Management"
        ]
      },
      { 
        name: "resources_needed", 
        label: "What resources do you need most from the incubator?", 
        type: "textarea", 
        required: true,
        placeholder: "Technical development, mentorship, funding, network, etc."
      }
    ]
  },
  {
    title: "Traction & Milestones",
    fields: [
      { 
        name: "current_stage", 
        label: "Current Development Stage", 
        type: "select", 
        required: true,
        options: [
          "Idea Stage",
          "Prototype",
          "MVP (Minimum Viable Product)",
          "Beta Testing",
          "Launched",
          "Growth Stage"
        ]
      },
      { 
        name: "users_customers", 
        label: "Number of Users/Customers", 
        type: "text", 
        required: false,
        placeholder: "Current user base or customer count"
      },
      { 
        name: "revenue", 
        label: "Monthly Recurring Revenue (if any)", 
        type: "text", 
        required: false,
        placeholder: "e.g., $5K MRR"
      },
      { 
        name: "key_achievements", 
        label: "Key Achievements So Far", 
        type: "textarea", 
        required: true,
        placeholder: "Awards, partnerships, press coverage, product milestones, etc."
      },
      { 
        name: "future_goals", 
        label: "Goals for Next 6 Months", 
        type: "textarea", 
        required: true,
        placeholder: "What do you plan to achieve in the next 6 months?"
      },
      { 
        name: "why_incubator", 
        label: "Why do you want to join Turning Ideas App Factory?", 
        type: "textarea", 
        required: true,
        placeholder: "What specifically attracts you to our incubator?"
      }
    ]
  }
];

const EvaluationForm = () => {
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [formData, setFormData] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingPreviousData, setLoadingPreviousData] = useState(false);

  // Load previous submission data on mount
  useEffect(() => {
    const loadPreviousData = async () => {
      setLoadingPreviousData(true);
      try {
        // Use the new, structured method. This is cleaner.
        const response = await apiService.submissions.getSubmissionStatus();

        if (response.data.success && response.data.stages) {
          const previousData = {};
          response.data.stages.forEach(stage => {
            Object.assign(previousData, stage.data);
          });
          setFormData(previousData);
          setSubmissionId(response.data.submission_id);
          
          // Set current stage to the last incomplete stage
          if (response.data.current_stage) {
            setCurrentStage(Math.min(response.data.current_stage, STAGES.length - 1));
          }
        }
      } catch (error) {
        console.error('Error loading previous data:', error);
        if (error.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoadingPreviousData(false);
      }
    };

    loadPreviousData();
  }, [navigate]);

  // Initialize form data for current stage
  useEffect(() => {
    const stage = STAGES[currentStage];
    const initialData = {};
    
    stage.fields.forEach(field => {
      if (!formData[field.name]) {
        if (field.type === 'checkbox') {
          initialData[field.name] = [];
        } else {
          initialData[field.name] = '';
        }
      }
    });
    
    if (Object.keys(initialData).length > 0) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [currentStage, formData]);

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
        } else if (!formData[field.name] || formData[field.name].toString().trim() === '') {
          newErrors[field.name] = 'This field is required';
        }
      }
      
      // Email validation
      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Please enter a valid email address';
        }
      }
      
      // Phone validation
      if (field.type === 'tel' && formData[field.name]) {
        const phoneRegex = /^[+]?[0-9\s()-]{10,}$/;
        if (!phoneRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Please enter a valid phone number';
        }
      }
      
      // URL validation
      if (field.type === 'url' && formData[field.name]) {
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!urlRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Please enter a valid website URL';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveStage = async () => {
    if (!validateStage()) {
      console.log("Validation Failed for the stage")
      return false;
    }

    setIsSubmitting(true);
    try {
      const stageData = {};
      STAGES[currentStage].fields.forEach(field => {
        stageData[field.name] = formData[field.name];
      });

      const response = await apiService.submissions.submitStage({
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
      const response = await apiService.submissions.submitFinal();  // No submissionId needed
      
      if (response.data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/pending-review');
        }, 2000);
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
              placeholder={field.placeholder}
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
              placeholder={field.placeholder}
              className={fieldError ? 'error' : ''}
            />
            {fieldError && <span className="error-message">{fieldError}</span>}
          </div>
        );
    }
  };

  if (loadingPreviousData) {
    return (
      <div className="evaluation-form">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your previous application data...</p>
        </div>
      </div>
    );
  }

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
