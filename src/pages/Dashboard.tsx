import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import apiService from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

// New Design Components
import { Overview } from '../components/Overview.tsx';
import { CompanyInfo } from '../components/CompanyInfo.tsx';
import { Evaluation } from '../components/Evaluation.tsx';
import { Products } from '../components/Products.tsx';
import { GTMStrategy } from '../components/GTMStrategy.tsx';
import { Business } from '../components/Business.tsx';
import { Milestones } from '../components/Milestones.tsx';
import { Funding } from '../components/Funding.tsx';

// Icons
import { 
  LayoutDashboard, 
  Building2, 
  ClipboardCheck, 
  Package, 
  Target, 
  TrendingUp, 
  Flag, 
  DollarSign 
} from "lucide-react";

type Section = 'overview' | 'company' | 'evaluation' | 'products' | 'gtm' | 'business' | 'milestones' | 'funding';

export default function Dashboard() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState<Section>('overview');

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiService.dashboard.getDashboard();
            console.log('Dashboard response:', response);

            if (response.data.success) {
                const data = response.data.data;
                if (data.startup) {
                    setDashboardData(data);
                } else if (data.submission_status) {
                    const status = data.submission_status;
                    if (status === 'pending' || status === 'in_review') {
                        navigate('/pending-review');
                    } else if (status === 'rejected') {
                        navigate('/rejected');
                    }
                } else {
                    navigate('/evaluation-form');
                }
            } else {
                setError(response.data.error || 'Failed to fetch dashboard data.');
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (loading) return <LoadingSpinner message="Loading your dashboard..." />;
    if (error) return <div>Error: {error}</div>;
    if (!dashboardData) return null;

    const { startup, context_areas } = dashboardData;

    const navigation = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'company', label: 'Company Info', icon: Building2 },
        { id: 'evaluation', label: 'Evaluation', icon: ClipboardCheck },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'gtm', label: 'GTM Strategy', icon: Target },
        { id: 'business', label: 'Business', icon: TrendingUp },
        { id: 'milestones', label: 'Milestones', icon: Flag },
        { id: 'funding', label: 'Funding', icon: DollarSign },
    ];

    const renderSection = () => {
        switch (activeSection) {
            case 'overview':
                return <Overview data={dashboardData} />;
            case 'company':
                return <CompanyInfo data={dashboardData} />;
            case 'evaluation':
                return <Evaluation data={context_areas.evaluation?.submission_details} />;
            case 'products':
                return <Products data={context_areas.product?.scope_data} />;
            case 'gtm':
                return <GTMStrategy data={context_areas.gtm?.scope_data} />;
            case 'business':
                return <Business data={context_areas.business?.monetization_data} />;
            case 'milestones':
                return <Milestones data={context_areas.milestones?.details} />;
            case 'funding':
                return <Funding data={context_areas.fundraise?.fundraising_data} />;
            default:
                return <Overview data={dashboardData} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-gray-900">{startup.name}</h1>
                    <p className="text-sm text-gray-500 mt-1">{startup.industry}</p>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id as Section)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                    activeSection === item.id
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button onClick={logout} className="w-full text-left text-sm text-gray-700 hover:bg-gray-100 p-2 rounded">Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {renderSection()}
            </main>
        </div>
    );
}
