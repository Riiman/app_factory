import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Overview from '../components/dashboard/Overview';
import CompanyInfo from '../components/dashboard/CompanyInfo';
import Products from '../components/dashboard/Products';
import Business from '../components/dashboard/Business';
import GTMStrategy from '../components/dashboard/GTMStrategy';
import Funding from '../components/dashboard/Funding';
import Milestones from '../components/dashboard/Milestones';
import Evaluation from '../components/dashboard/Evaluation';
import api from '../utils/api';

const DashboardPage: FC = () => {
  const [user, setUser] = useState<any>(null);
  const [startupData, setStartupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/login');
    }

    const fetchStartupData = async () => {
      try {
        // For now, we'll hardcode the startup ID.
        // In the future, this would come from the user's session or a list of their startups.
        const response = await api.fetch('/startups/1');
        const data = await response.json();

        if (data.success) {
          setStartupData(data.startup);
        } else {
          console.error('Failed to fetch startup data:', data.error);
        }
      } catch (error) {
        console.error('Failed to fetch startup data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStartupData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.fetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('user');
      window.location.href = '/login'; 
    }
  };

  if (loading || !user) {
    return <div>Loading dashboard...</div>;
  }

  if (!startupData) {
    return <div>No startup data found.</div>;
  }

  // Destructure data for easier access
  const { 
    name, 
    overall_progress, 
    current_stage, 
    next_milestone, 
    recent_activity, 
    evaluation,
    products,
    business,
    marketing,
    fundraise,
    founders,
    tasks,
    integrations,
    experiments,
    requests
  } = startupData;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome, {user.full_name}!</h1>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
      
      <Overview 
        startupName={name}
        overallProgress={overall_progress}
        currentStage={current_stage}
        nextMilestone={next_milestone}
        recentActivity={recent_activity || []}
      />

      {/* Company Info - using mock data for now, will populate from 'business' or 'founders' later */}
      <CompanyInfo 
        companyName={name}
        vision={business?.vision || ""}
        mission={business?.mission || ""}
        location={business?.location || ""}
        website={business?.website || ""}
      />

      {/* Products */}
      <Products products={products || []} />

      {/* Business Model */}
      <Business 
        businessModel={business?.model_description || ""}
        targetAudience={business?.target_audience || ""}
        pricingStrategy={business?.pricing_strategy || ""}
      />

      {/* Go-To-Market Strategy */}
      <GTMStrategy 
        marketingChannels={marketing?.channels || []}
        salesStrategy={marketing?.sales_strategy || ""}
        customerAcquisitionCost={marketing?.customer_acquisition_cost || 0}
      />

      {/* Funding */}
      <Funding 
        fundingStatus={fundraise?.status || 'Bootstrapped'}
        amountRaised={fundraise?.amount_raised || 0}
        nextFundingGoal={fundraise?.next_funding_goal || 0}
      />

      {/* Milestones - using mock data for now, will populate from 'tasks' or 'experiments' later */}
      <Milestones milestones={[
        { name: "Launch Beta", dueDate: "2025-12-31", status: 'In Progress' as const },
        { name: "Secure first 100 users", dueDate: "2026-03-31", status: 'Not Started' as const },
        { name: "Raise Series A", dueDate: "2026-06-30", status: 'Not Started' as const },
      ]} />

      {/* Evaluation */}
      {evaluation && <Evaluation 
        overallScore={evaluation.overall_score}
        finalDecision={evaluation.final_decision}
        overallSummary={evaluation.overall_summary}
        problemAnalysis={evaluation.problem_analysis}
        solutionAnalysis={evaluation.solution_analysis}
      />}

      {/* TODO: Add components for Tasks, Integrations, Experiments, Requests */}
    </div>
  );
};

export default DashboardPage;
