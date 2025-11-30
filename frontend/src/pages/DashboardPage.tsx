import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Scope, Startup, BusinessMonthlyData, FundingRound, Task, Experiment, Artifact, LinkedEntityType, Product, Feature, ProductMetric, ProductIssue, ExperimentStatus, Investor, MarketingCampaign, MarketingCampaignStatus, MarketingContentStatus, MarketingContentItem, Founder, BusinessOverview } from '@/types/dashboard-types';
import api from '@/utils/api'; // Import the api utility
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import DashboardOverview from './dashboard/DashboardOverview';
import TasksPage from './dashboard/TasksPage';
import ProductListPage from './dashboard/ProductListPage';
import ProductDetailPage from './dashboard/ProductDetailPage';
import ProductMetricsPage from './dashboard/ProductMetricsPage';
import ProductIssuesPage from './dashboard/ProductIssuesPage';
import BusinessOverviewPage from './dashboard/BusinessOverviewPage';
import BusinessMonthlyReportingPage from './dashboard/BusinessMonthlyReportingPage';
import MonthlyReportDetailModal from '@/components/dashboard/MonthlyReportDetailModal';
import FundraisingOverviewPage from './dashboard/FundraisingOverviewPage';
import FundingRoundsPage from './dashboard/FundingRoundsPage';
import InvestorCrmPage from './dashboard/InvestorCrmPage';
import FundingRoundDetailPage from './dashboard/FundingRoundDetailPage';
import MarketingOverviewPage from './dashboard/MarketingOverviewPage';
import MarketingCampaignsPage from './dashboard/MarketingCampaignsPage';
import MarketingCampaignDetailPage from './dashboard/MarketingCampaignDetailPage';
import MarketingContentCalendarPage from './dashboard/MarketingContentCalendarPage';
import TaskDetailModal from '@/components/dashboard/TaskDetailModal';
import ExperimentsPage from './dashboard/ExperimentsPage';
import ExperimentDetailModal from '@/components/dashboard/ExperimentDetailModal';
import ArtifactsPage from './dashboard/ArtifactsPage';
import ArtifactDetailModal from '@/components/dashboard/ArtifactDetailModal';
import TeamPage from './dashboard/TeamPage';
import SettingsPage from './dashboard/SettingsPage';
import { Home, Package, Briefcase, DollarSign, Megaphone, BookOpen, Users, Settings } from 'lucide-react';
import CreateModal from '@/components/dashboard/CreateModal';
import CreateTaskModal from '@/components/dashboard/CreateTaskModal';
import CreateExperimentModal from '@/components/dashboard/CreateExperimentModal';
import CreateArtifactModal from '@/components/dashboard/CreateArtifactModal';
import CreateProductModal from '@/components/dashboard/CreateProductModal';
import CreateFeatureModal from '@/components/dashboard/CreateFeatureModal';
import CreateMetricModal from '@/components/dashboard/CreateMetricModal';
import CreateIssueModal from '@/components/dashboard/CreateIssueModal';
import CreateMonthlyReportModal from '@/components/dashboard/CreateMonthlyReportModal';
import CreateFundingRoundModal from '@/components/dashboard/CreateFundingRoundModal';
import CreateInvestorModal from '@/components/dashboard/CreateInvestorModal';
import CreateCampaignModal from '@/components/dashboard/CreateCampaignModal';
import CreateContentItemModal from '@/components/dashboard/CreateContentItemModal';
import CreateFounderModal from '@/components/dashboard/CreateFounderModal';
import EditBusinessOverviewModal from '@/components/dashboard/EditBusinessOverviewModal';
import EditFundraisingGoalsModal from '@/components/dashboard/EditFundraisingGoalsModal';
import EditCampaignModal from '@/components/dashboard/EditCampaignModal';
import EditFounderModal from '@/components/dashboard/EditFounderModal';
import EditProductModal from '@/components/dashboard/EditProductModal';
import EditProductBusinessDetailsModal from '@/components/dashboard/EditProductBusinessDetailsModal';
import EditFundingRoundModal from '@/components/dashboard/EditFundingRoundModal';

import { useAuth } from '@/contexts/AuthContext';

type CreateModalType = 'task' | 'experiment' | 'artifact';

const DashboardPage: React.FC = () => {
    const { handleLogout } = useAuth();
    const location = useLocation();
    // --- State Management ---
    const [startupData, setStartupData] = useState<Startup | null>(null);
    const [tasks, setTasks] = useState<Task[] | null>(null);
    const [experiments, setExperiments] = useState<Experiment[] | null>(null);
    const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);
    const [products, setProducts] = useState<Product[] | null>(null);
    const [monthlyReports, setMonthlyReports] = useState<BusinessMonthlyData[] | null>(null);
    const [fundingRounds, setFundingRounds] = useState<FundingRound[] | null>(null);
    const [investors, setInvestors] = useState<Investor[] | null>(null);
    const [founders, setFounders] = useState<Founder[] | null>(null);
    const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchStartupData = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (!storedUser) {
                    throw new Error("User not found in local storage");
                }
                const user = JSON.parse(storedUser);
                const startupId = user?.startup_id;

                if (!startupId) {
                    throw new Error("Startup ID not found for the user");
                }

                const data = await api.getStartupData(startupId);
                console.log("Backend data received:", data);
                setStartupData(data);
                setMarketingCampaigns(data.marketing_campaigns || []);
                setInvestors(data.investors || []);
                setFundingRounds(data.funding_rounds || []);
                setMonthlyReports(data.monthly_data || []);
                setProducts(data.products || []);
                setTasks(data.tasks || []);
                setExperiments(data.experiments || []);
                setArtifacts(data.artifacts || []);
                setFounders(data.founders || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStartupData();
    }, [location]);

    useEffect(() => {
        const fetchMarketingOverview = async () => {
            if (startupData?.id) {
                try {
                    const marketingOverview = await api.getMarketingOverview(startupData.id);
                    setStartupData(prev => prev ? ({ ...prev, marketing_overview: marketingOverview }) : null);
                } catch (error) {
                    console.error("Failed to fetch marketing overview:", error);
                }
            }
        };

        fetchMarketingOverview();
    }, [startupData?.id]);

    // --- Navigation State ---
    /** The currently active main section/scope from the sidebar (e.g., Dashboard, Product). */
    const [activeScope, setActiveScope] = useState<Scope>(Scope.DASHBOARD);
    /** The currently active sub-page within a scope (e.g., 'Products List', 'Product Metrics'). */
    const [activeSubPage, setActiveSubPage] = useState<string>('Overview');
    /** The ID of the currently selected product for viewing its detail page. */
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    /** The ID of the currently selected funding round for viewing its detail page. */
    const [selectedFundingRoundId, setSelectedFundingRoundId] = useState<number | null>(null);
    /** The ID of the currently selected marketing campaign for viewing its detail page. */
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    
    // --- Detail Modal States ---
    /** Visibility state for the Monthly Report detail modal. */
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    /** The monthly report data currently displayed in the detail modal. */
    const [selectedReport, setSelectedReport] = useState<BusinessMonthlyData | null>(null);
    
    /** Visibility state for the Task detail modal. */
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    /** The task data currently displayed in the detail modal. */
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    /** Visibility state for the Experiment detail modal. */
    const [isExperimentModalOpen, setIsExperimentModalOpen] = useState(false);
    /** The experiment data currently displayed in the detail modal. */
    const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
    
    /** Visibility state for the Artifact detail modal. */
    const [isArtifactModalOpen, setIsArtifactModalOpen] = useState(false);
    /** The artifact data currently displayed in the detail modal. */
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

    // --- Create Modal States ---
    /** Visibility state for the main "Create New..." modal. */
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    /** Visibility state for the "Create Task" modal. */
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    /** Visibility state for the "Create Experiment" modal. */
    const [isCreateExperimentModalOpen, setIsCreateExperimentModalOpen] = useState(false);
    /** Visibility state for the "Create Artifact" modal. */
    const [isCreateArtifactModalOpen, setIsCreateArtifactModalOpen] = useState(false);
    /** Visibility state for the "Create Product" modal. */
    const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
    /** Visibility state for the "Create Feature" modal. */
    const [isCreateFeatureModalOpen, setIsCreateFeatureModalOpen] = useState(false);
    /** Visibility state for the "Create Metric" modal. */
    const [isCreateMetricModalOpen, setIsCreateMetricModalOpen] = useState(false);
    /** Visibility state for the "Create Issue" modal. */
    const [isCreateIssueModalOpen, setIsCreateIssueModalOpen] = useState(false);
    /** Visibility state for the "Create Monthly Report" modal. */
    const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
    /** Visibility state for the "Create Funding Round" modal. */
    const [isCreateFundingRoundModalOpen, setIsCreateFundingRoundModalOpen] = useState(false);
    /** Visibility state for the "Create Investor" modal. */
    const [isCreateInvestorModalOpen, setIsCreateInvestorModalOpen] = useState(false);
    /** Visibility state for the "Create Campaign" modal. */
    const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
    /** Visibility state for the "Create Content Item" modal. */
    const [isCreateContentItemModalOpen, setIsCreateContentItemModalOpen] = useState(false);
    /** Stores the ID of a campaign when creating content from its detail page. */
    const [selectedCampaignForContent, setSelectedCampaignForContent] = useState<number | null>(null);
    /** Visibility state for the "Create Founder" modal. */
    const [isCreateFounderModalOpen, setIsCreateFounderModalOpen] = useState(false);
    const [isEditBusinessOverviewModalOpen, setIsEditBusinessOverviewModalOpen] = useState(false);
    const [isEditFundraisingGoalsModalOpen, setIsEditFundraisingGoalsModalOpen] = useState(false);
    const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
    const [selectedCampaignToEdit, setSelectedCampaignToEdit] = useState<MarketingCampaign | null>(null);
    const [selectedLinkedScope, setSelectedLinkedScope] = useState<Scope | null>(null);
    const [selectedLinkedId, setSelectedLinkedId] = useState<number | null>(null);
    const [isEditFounderModalOpen, setIsEditFounderModalOpen] = useState(false);
    const [selectedFounderToEdit, setSelectedFounderToEdit] = useState<Founder | null>(null);
    const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
    const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
    const [isEditProductBusinessDetailsModalOpen, setIsEditProductBusinessDetailsModalOpen] = useState(false);
    const [selectedProductBusinessDetailsToEdit, setSelectedProductBusinessDetailsToEdit] = useState<ProductBusinessDetails | null>(null);
    const [productIdForBusinessDetailsEdit, setProductIdForBusinessDetailsEdit] = useState<number | null>(null);
    const [isEditFundingRoundModalOpen, setIsEditFundingRoundModalOpen] = useState(false);
    const [selectedFundingRoundToEdit, setSelectedFundingRoundToEdit] = useState<FundingRound | null>(null);


    /**
     * Handles navigation clicks from the sidebar.
     * @param {Scope} scope - The main scope to navigate to.
     * @param {string} [subPage='Overview'] - The sub-page to display within the scope.
     */
    const handleNavClick = (scope: Scope, subPage: string = 'Overview') => {
        setActiveScope(scope);
        setActiveSubPage(subPage);
        setSelectedProductId(null);
        setSelectedFundingRoundId(null);
        setSelectedCampaignId(null);
    };

    /** Placeholder for a user logout action. In a real app, this would involve an API call and session clearing. */
    const handleSelectCampaign = (campaignId: number) => {
        setSelectedCampaignId(campaignId);
    };

    const handleSelectProduct = (productId: number) => {
        setSelectedProductId(productId);
        setActiveScope(Scope.PRODUCT);
        setActiveSubPage('Products List');
    };
    
    const handleSelectFundingRound = (roundId: number) => {
        setSelectedFundingRoundId(roundId);
    };

    //const handleBackToList = () => setSelectedProductId(null);
    //const handleBackToRoundsList = () => setSelectedFundingRoundId(null);
    //const handleBackToCampaignsList = () => setSelectedCampaignId(null);
    const handleOpenReportModal = (report: BusinessMonthlyData) => { setSelectedReport(report); setIsReportModalOpen(true); };
    const handleCloseReportModal = () => { setIsReportModalOpen(false); setSelectedReport(null); };

    const handleOpenTaskModal = (task: Task) => { setSelectedTask(task); setIsTaskModalOpen(true); };
    const handleCloseTaskModal = () => { setIsTaskModalOpen(false); setSelectedTask(null); };

    const handleOpenExperimentModal = (experiment: Experiment) => { setSelectedExperiment(experiment); setIsExperimentModalOpen(true); };
    const handleCloseExperimentModal = () => { setIsExperimentModalOpen(false); setSelectedExperiment(null); };

    const handleOpenArtifactModal = (artifact: Artifact) => { setSelectedArtifact(artifact); setIsArtifactModalOpen(true); };
    const handleCloseArtifactModal = () => { setIsArtifactModalOpen(false); setSelectedArtifact(null); };

    // --- Open/Close Create Modals ---
    const handleOpenCreateModal = () => setIsCreateModalOpen(true);
    const handleCloseCreateModal = () => setIsCreateModalOpen(false);
    
    const handleSelectCreateType = (type: CreateModalType) => {
        setIsCreateModalOpen(false);
        if (type === 'task') setIsCreateTaskModalOpen(true);
        if (type === 'experiment') setIsCreateExperimentModalOpen(true);
        if (type === 'artifact') setIsCreateArtifactModalOpen(true);
    };

    const handleOpenCreateContentItemModal = (campaignId: number | null = null) => {
        setSelectedCampaignForContent(campaignId);
        setIsCreateContentItemModalOpen(true);
    }
    
    // --- Create Handlers (Backend Integration Points) ---
    /**
     * Handles the creation of a new task.
     * @param {Omit<Task, 'id' | 'startup_id' | 'created_at'>} newTaskData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     * On success, the backend should return the newly created task, and the local state should be updated.
     */
    const handleCreateTask = async (newTaskData: Omit<Task, 'id' | 'startup_id' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newTask = await api.createTask(startupData.id, newTaskData);
            setTasks(prev => [...(prev || []), newTask]);
            setIsCreateTaskModalOpen(false);
        } catch (error) {
            console.error("Failed to create task:", error);
            // Optionally, display an error message to the user
        }
    };
    
    const handleCreateExperiment = async (newExperimentData: Omit<Experiment, 'id' | 'startup_id' | 'created_at' | 'status'>) => {
        if (!startupData) return;
        try {
            const newExperiment = await api.createExperiment(startupData.id, newExperimentData);
            setExperiments(prev => [...(prev || []), newExperiment]);
            setIsCreateExperimentModalOpen(false);
        } catch (error) {
            console.error("Failed to create experiment:", error);
        }
    };

    const handleCreateArtifact = async (newArtifactData: Omit<Artifact, 'id' | 'startup_id' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newArtifact = await api.createArtifact(startupData.id, newArtifactData);
            setArtifacts(prev => [...(prev || []), newArtifact]);
            setIsCreateArtifactModalOpen(false);
        } catch (error) {
            console.error("Failed to create artifact:", error);
        }
    };
    
    const handleCreateProduct = async (newProductData: Omit<Product, 'id' | 'startup_id' | 'tech_stack' | 'features' | 'metrics' | 'issues' | 'business_details'>) => {
        if (!startupData) return;
        try {
            const newProduct = await api.createProduct(startupData.id, newProductData);
            setProducts(prev => [...(prev || []), newProduct]);
            setIsCreateProductModalOpen(false);
        } catch (error) {
            console.error("Failed to create product:", error);
        }
    };

    const handleCreateFeature = async (newFeatureData: Omit<Feature, 'id' | 'product_id'>, productId: number) => {
        if (!startupData) return;
        try {
            const newFeature = await api.createFeature(startupData.id, productId, newFeatureData);
            setProducts(prev => {
                if (!prev) return null;
                return prev.map(p => 
                    p.id === productId 
                        ? { ...p, features: [...p.features, newFeature] } 
                        : p
                );
            });
            setIsCreateFeatureModalOpen(false);
        } catch (error) {
            console.error("Failed to create feature:", error);
        }
    };

    const handleCreateMetric = async (newMetricData: Omit<ProductMetric, 'metric_id' | 'product_id'>, productId: number) => {
        if (!startupData) return;
        try {
            const newMetric = await api.createMetric(startupData.id, productId, newMetricData);
            setProducts(prev => {
                if (!prev) return null;
                return prev.map(p => 
                    p.id === productId 
                        ? { ...p, product_metrics: [...p.product_metrics, newMetric] } 
                        : p
                );
            });
            setIsCreateMetricModalOpen(false);
        } catch (error) {
            console.error("Failed to create metric:", error);
        }
    };

    const handleCreateIssue = async (newIssueData: Omit<ProductIssue, 'issue_id' | 'product_id' | 'created_by' | 'created_at'>, productId: number) => {
        if (!startupData) return;
        try {
            const newIssue = await api.createIssue(startupData.id, productId, newIssueData);
            setProducts(prev => {
                if (!prev) return null;
                return prev.map(p => 
                    p.id === productId 
                        ? { ...p, product_issues: [...p.product_issues, newIssue] } 
                        : p
                );
            });
            setIsCreateIssueModalOpen(false);
        } catch (error) {
            console.error("Failed to create issue:", error);
        }
    };

    /**
     * Handles the creation of a new monthly report.
     * @param {Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>} newReportData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateMonthlyReport = async (newReportData: Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newReport = await api.createMonthlyReport(startupData.id, newReportData);
            setMonthlyReports(prev => [...(prev || []), newReport]);
            setIsCreateReportModalOpen(false);
        } catch (error) {
            console.error("Failed to create monthly report:", error);
        }
    };

    /**
     * Handles the creation of a new funding round.
     * @param {Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'round_investors'>} newRoundData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateFundingRound = async (newRoundData: Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'investors'>) => {
        if (!startupData) return;
        try {
            const newRound = await api.createFundingRound(startupData.id, newRoundData);
            setFundingRounds(prev => [...(prev || []), newRound]);
            setIsCreateFundingRoundModalOpen(false);
        } catch (error) {
            console.error("Failed to create funding round:", error);
        }
    };
    
    /**
     * Handles the creation of a new investor.
     * @param {Omit<Investor, 'investor_id' | 'created_at'>} newInvestorData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateInvestor = async (newInvestorData: Omit<Investor, 'investor_id' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newInvestor = await api.createInvestor(startupData.id, newInvestorData);
            setInvestors(prev => [...(prev || []), newInvestor]);
            setIsCreateInvestorModalOpen(false);
        } catch (error) {
            console.error("Failed to create investor:", error);
        }
    };
    
    /**
     * Handles the creation of a new marketing campaign.
     * @param {Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar'>} newCampaignData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateCampaign = async (newCampaignData: Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar' | 'spend'>) => {
        if (!startupData) return;
        try {
            const newCampaign = await api.createCampaign(startupData.id, newCampaignData);
            setMarketingCampaigns(prev => [...(prev || []), { ...newCampaign, content_mode: newCampaignData.content_mode }]);
            setIsCreateCampaignModalOpen(false);
        } catch (error) {
            console.error("Failed to create campaign:", error);
        }
    };
    
    /**
     * Handles the creation of a new content item.
     * @param {Omit<MarketingContentItem, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>} newContentData - The new content item data.
     * @param {number} campaignId - The ID of the campaign to add the content to.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateContentItem = async (newContentData: Omit<MarketingContentItem, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>, campaignId: number) => {
        if (!startupData) return;
        try {
            const newItem = await api.createContentItem(startupData.id, campaignId, newContentData);
            setMarketingCampaigns(prev => {
                if (!prev) return null;
                return prev.map(c => {
                    if (c.campaign_id === campaignId && c.content_calendars && c.content_calendars.length > 0) {
                        // Assuming there's always at least one content calendar if content_mode is true
                        const updatedContentCalendars = c.content_calendars.map((calendar, index) => {
                            if (index === 0) { // Update the first content calendar
                                return {
                                    ...calendar,
                                    content_items: [...calendar.content_items, newItem]
                                };
                            }
                            return calendar;
                        });
                        return { ...c, content_calendars: updatedContentCalendars };
                    }
                    return c;
                });
            });
            setIsCreateContentItemModalOpen(false);
        } catch (error) {
            console.error("Failed to create content item:", error);
        }
    };

    /**
     * Handles the creation of a new founder.
     * @param {Omit<Founder, 'id' | 'startup_id'>} newFounderData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateFounder = async (newFounderData: Omit<Founder, 'id' | 'startup_id'>) => {
        if (!startupData) return;
        try {
            const response = await api.createFounder(startupData.id, newFounderData);
            setFounders(prev => [...(prev || []), response.founder]);
            setIsCreateFounderModalOpen(false);
        } catch (error) {
            console.error("Failed to create founder:", error);
        }
    };

    /**
     * Handles saving updated startup settings.
     * @param {{ name: string; slug: string; next_milestone: string }} updatedSettings - The new settings values.
     * @backend This function should be replaced with a PUT/PATCH API call to the backend.
     */
    const handleUpdateStartupSettings = async (updatedSettings: { name: string; slug: string; next_milestone: string }) => {
        if (!startupData) return;
        try {
            const updatedStartup = await api.updateStartupSettings(startupData.id, updatedSettings);
            setStartupData(updatedStartup);
            // Here you would typically show a success notification
            
        } catch (error) {
            console.error("Failed to update startup settings:", error);
        }
    };

    const handleUpdateBusinessOverview = async (updatedData: Partial<BusinessOverview>) => {
        if (!startupData) return;
        try {
            const updatedBusinessOverview = await api.updateBusinessOverview(startupData.id, updatedData);
            setStartupData(prev => prev ? ({ ...prev, business_overview: updatedBusinessOverview }) : null);
            setIsEditBusinessOverviewModalOpen(false);
        } catch (error) {
            console.error("Failed to update business overview:", error);
        }
    };

    const handleUpdateFundraisingGoals = async (
        updatedFundraiseData: Partial<Fundraise>, 
        updatedNextFundingGoalData: Partial<NextFundingGoal>
    ) => {
        if (!startupData) return;
        try {
            const response = await api.updateFundraisingGoals(
                startupData.id, 
                updatedFundraiseData, 
                updatedNextFundingGoalData
            );
            setStartupData(prev => prev ? ({ 
                ...prev, 
                fundraise_details: response.fundraise_details, 
                // Assuming next_funding_goal is nested within fundraise_details
                // If it's returned separately, handle it accordingly.
                // For now, let's assume fundraise_details will contain the updated next_funding_goal
                // if it was updated, or if next_funding_goal is a top-level property on startupData.
                // Based on Startup type, fundraise_details contains next_funding_goal
            }) : null);
            setIsEditFundraisingGoalsModalOpen(false);
        } catch (error) {
            console.error("Failed to update fundraising goals:", error);
        }
    };

    const handleUpdateCampaign = async (campaignId: number, updatedData: Partial<MarketingCampaign>) => {
        if (!startupData) return;
        try {
            const response = await api.updateCampaign(startupData.id, campaignId, updatedData);
            setMarketingCampaigns(prev => prev ? prev.map(c => c.campaign_id === campaignId ? response.campaign : c) : null);
            setIsEditCampaignModalOpen(false);
        } catch (error) {
            console.error("Failed to update campaign:", error);
        }
    };

    const handleUpdateFounder = async (founderId: number, updatedData: Partial<Founder>) => {
        if (!startupData) return;
        try {
            const response = await api.updateFounder(startupData.id, founderId, updatedData);
            setFounders(prev => prev ? prev.map(f => f.id === founderId ? response.founder : f) : null);
            setIsEditFounderModalOpen(false);
        } catch (error) {
            console.error("Failed to update founder:", error);
        }
    };

    const handleDeleteFounder = async (founderId: number) => {
        if (!startupData) return;
        try {
            await api.deleteFounder(startupData.id, founderId);
            setFounders(prev => prev ? prev.filter(f => f.id !== founderId) : null);
            // Optionally, show a success message
        } catch (error) {
            console.error("Failed to delete founder:", error);
            // Optionally, show an error message
        }
    };

    const handleUpdateProduct = async (productId: number, updatedData: Partial<Product>) => {
        if (!startupData) return;
        try {
            const response = await api.updateProduct(startupData.id, productId, updatedData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? response.product : p) : null);
            setIsEditProductModalOpen(false);
        } catch (error) {
            console.error("Failed to update product:", error);
        }
    };

    const handleUpdateProductBusinessDetails = async (productId: number, updatedData: Partial<ProductBusinessDetails>) => {
        if (!startupData) return;
        try {
            const response = await api.updateProductBusinessDetails(startupData.id, productId, updatedData);
            setProducts(prev => prev ? prev.map(p => 
                p.id === productId 
                    ? { ...p, business_details: response.product_business_details } 
                    : p
            ) : null);
            setIsEditProductBusinessDetailsModalOpen(false);
        } catch (error) {
            console.error("Failed to update product business details:", error);
        }
    };

    const handleUpdateFundingRound = async (roundId: number, updatedData: Partial<FundingRound>) => {
        if (!startupData) return;
        try {
            const response = await api.updateFundingRound(startupData.id, roundId, updatedData);
            setFundingRounds(prev => prev ? prev.map(r => r.round_id === roundId ? response.round : r) : null);
            setIsEditFundingRoundModalOpen(false);
        } catch (error) {
            console.error("Failed to update funding round:", error);
        }
    };


    const handleBackToList = () => setSelectedProductId(null);
    const handleBackToRoundsList = () => setSelectedFundingRoundId(null);
    const handleBackToCampaignsList = () => setSelectedCampaignId(null);
    
    /**
     * Finds the name of a linked entity (Product, FundingRound, etc.) by its type and ID.
     * Used to provide context in detail modals.
     */
    const getLinkedEntityName = (type?: string, id?: number): string | null => {
        if (!type || !id || !startupData) return null;
        switch (type) {
            case 'Product':
                return startupData.products.find(p => p.id === id)?.name || null;
            case 'FundingRound':
                return startupData.funding_rounds.find(r => r.round_id === id)?.round_type || null;
            case 'MarketingCampaign':
                return startupData.marketing_campaigns.find(c => c.campaign_id === id)?.campaign_name || null;
            default:
                return null;
        }
    };


    const handlePositioningStatementUpdate = (newStatement: string) => {
        setStartupData(prev => {
            if (!prev) return null;
            const newMarketingOverview = prev.marketing_overview 
                ? { ...prev.marketing_overview, positioning_statement: newStatement }
                : { marketing_id: 0, startup_id: prev.id, positioning_statement: newStatement };
            return { ...prev, marketing_overview: newMarketingOverview };
        });
    };

    /**
     * Main content router for the application.
     * Renders the correct page component based on the `activeScope` and `activeSubPage` state.
     */
    const renderContent = () => {
        if (!startupData) return null; // Should be handled by loading/error state ideally

        switch (activeScope) {
            case Scope.DASHBOARD:
                return <DashboardOverview startupData={{...startupData, monthly_data: monthlyReports || []}} />;
            
            case Scope.PRODUCT:
                if (activeSubPage === 'Products List') {
                    const selectedProduct = products?.find(p => p.id === selectedProductId);
                    if (selectedProduct) {
                        return <ProductDetailPage 
                            product={selectedProduct}
                            linkedTasks={tasks?.filter(t => t.linked_to_type === 'Product' && t.linked_to_id === selectedProduct.id) || []}
                            linkedExperiments={experiments?.filter(e => e.linked_to_type === 'Product' && e.linked_to_id === selectedProduct.id) || []}
                            linkedArtifacts={artifacts?.filter(a => a.linked_to_type === 'Product' && a.linked_to_id === selectedProduct.id) || []}
                            onBack={handleBackToList}
                            onAddFeature={() => setIsCreateFeatureModalOpen(true)}
                            onAddMetric={() => setIsCreateMetricModalOpen(true)}
                            onAddIssue={() => setIsCreateIssueModalOpen(true)}
                            onEditProduct={(product) => { setSelectedProductToEdit(product); setIsEditProductModalOpen(true); }}
                            onEditProductBusinessDetails={(productId, businessDetails) => { 
                                setProductIdForBusinessDetailsEdit(productId);
                                setSelectedProductBusinessDetailsToEdit(businessDetails); 
                                setIsEditProductBusinessDetailsModalOpen(true); 
                            }}
                        />;
                    }
                    return <ProductListPage startupId={startupData.id} products={products || []} setProducts={setProducts} onSelectProduct={handleSelectProduct} onAddNewProduct={() => setIsCreateProductModalOpen(true)} />;
                }
                if (activeSubPage === 'Product Metrics') {
                    return <ProductMetricsPage startupId={startupData.id} products={products || []} setProducts={setProducts} onAddNewMetric={() => setIsCreateMetricModalOpen(true)} />;
                }
                if (activeSubPage === 'Issues & Feedback') {
                    return <ProductIssuesPage startupId={startupData.id} products={products} setProducts={setProducts} onAddNewIssue={() => setIsCreateIssueModalOpen(true)} />;
                }
                return <ProductListPage startupId={startupData.id} products={products || []} setProducts={setProducts} onSelectProduct={handleSelectProduct} onAddNewProduct={() => setIsCreateProductModalOpen(true)} />;

            case Scope.BUSINESS:
                                  if (activeSubPage === 'Overview & Model') {
                                     return <BusinessOverviewPage 
                                                 businessOverview={startupData.business_overview || {} as BusinessOverview} 
                                                 monthlyData={monthlyReports || []}
                                                 onEdit={() => setIsEditBusinessOverviewModalOpen(true)}
                                            />;
                                 }                 if (activeSubPage === 'Monthly Reporting') {
                                    return <BusinessMonthlyReportingPage 
                                                startupId={startupData.id}
                                                monthlyData={monthlyReports || []}
                                                setMonthlyData={setMonthlyReports}
                                                onRowClick={handleOpenReportModal}
                                                onAddNewReport={() => setIsCreateReportModalOpen(true)}
                                           />;                }
                                        return <BusinessOverviewPage 
                                                    businessOverview={startupData.business_overview || {} as BusinessOverview}
                                                    monthlyData={monthlyReports || []}
                                                    onEdit={() => setIsEditBusinessOverviewModalOpen(true)}
                                               />;            case Scope.FUNDRAISING:
                if (activeSubPage === 'Overview') {
                    return <FundraisingOverviewPage 
                                fundraiseDetails={startupData.fundraise_details}
                                onEdit={() => setIsEditFundraisingGoalsModalOpen(true)}
                           />;
                }
                if (activeSubPage === 'Funding Rounds') {
                    const selectedRound = fundingRounds?.find(r => r.round_id === selectedFundingRoundId);
                    if (selectedRound) {
                        return <FundingRoundDetailPage 
                                    round={selectedRound}
                                    investors={investors || []}
                                    linkedTasks={tasks?.filter(t => t.linked_to_type === 'FundingRound' && t.linked_to_id === selectedRound.round_id) || []}
                                    linkedArtifacts={artifacts?.filter(a => a.linked_to_type === 'FundingRound' && a.linked_to_id === selectedRound.round_id) || []}
                                    onBack={handleBackToRoundsList}
                                    onEditRound={(round) => { setSelectedFundingRoundToEdit(round); setIsEditFundingRoundModalOpen(true); }}
                                    onAddInvestor={(roundId) => {
                                        // No specific modal for Add Investor from here, it's usually managed in InvestorCrmPage
                                        // For now, we'll just open the generic CreateInvestorModal without pre-linking
                                        // Or, if linking is desired, we'd need a way to pass the roundId to the modal
                                        // For now, let's open the CreateInvestorModal
                                        setIsCreateInvestorModalOpen(true);
                                        // If we wanted to link it to the round, we would need to pass these:
                                        // setSelectedLinkedScope(Scope.FUNDRAISING);
                                        // setSelectedLinkedId(roundId);
                                    }}
                                    onAddTask={(roundId) => {
                                        setSelectedLinkedScope(Scope.FUNDRAISING);
                                        setSelectedLinkedId(roundId);
                                        setIsCreateTaskModalOpen(true);
                                    }}
                                    onAddArtifact={(roundId) => {
                                        setSelectedLinkedScope(Scope.FUNDRAISING);
                                        setSelectedLinkedId(roundId);
                                        setIsCreateArtifactModalOpen(true);
                                    }}
                               />
                    }
                    return <FundingRoundsPage 
                                startupId={startupData.id}
                                fundingRounds={fundingRounds}
                                setFundingRounds={setFundingRounds}
                                onSelectRound={handleSelectFundingRound} 
                                onAddNewRound={() => setIsCreateFundingRoundModalOpen(true)}
                           />;
                }
                if (activeSubPage === 'Investor CRM') {
                    return <InvestorCrmPage
                                startupId={startupData.id} 
                                investors={investors}
                                setInvestors={setInvestors}
                                onAddNewInvestor={() => setIsCreateInvestorModalOpen(true)} 
                           />;
                }
                return <FundraisingOverviewPage fundraiseDetails={startupData.fundraise_details} />;

            case Scope.MARKETING:
                
                if (activeSubPage === 'Overview') {
                    return <MarketingOverviewPage 
                                marketingOverview={startupData.marketing_overview} 
                                campaigns={marketingCampaigns || []}
                                startupId={startupData.id}
                                onPositioningStatementUpdate={handlePositioningStatementUpdate}
                            />;
                }
                if (activeSubPage === 'Campaigns') {
                    const selectedCampaign = (marketingCampaigns || []).find(c => c.campaign_id === selectedCampaignId);
                     if (selectedCampaign) {
                        return <MarketingCampaignDetailPage 
                                    campaign={selectedCampaign}
                                    linkedTasks={tasks?.filter(t => t.linked_to_type === 'MarketingCampaign' && t.linked_to_id === selectedCampaign.campaign_id) || []}
                                    linkedArtifacts={artifacts?.filter(a => a.linked_to_type === 'MarketingCampaign' && a.linked_to_id === selectedCampaign.campaign_id) || []}
                                    onBack={handleBackToCampaignsList}
                                    onAddContentItem={() => handleOpenCreateContentItemModal(selectedCampaign.campaign_id)}
                                    onEditCampaign={(campaign) => { setSelectedCampaignToEdit(campaign); setIsEditCampaignModalOpen(true); }}
                                    onAddTask={(campaignId) => {
                                        setSelectedLinkedScope(Scope.MARKETING);
                                        setSelectedLinkedId(campaignId);
                                        setIsCreateTaskModalOpen(true);
                                    }}
                                    onAddArtifact={(campaignId) => {
                                        setSelectedLinkedScope(Scope.MARKETING);
                                        setSelectedLinkedId(campaignId);
                                        setIsCreateArtifactModalOpen(true);
                                    }}
                               />
                    }
                    return <MarketingCampaignsPage
                                startupId={startupData.id} 
                                campaigns={marketingCampaigns || []}
                                setCampaigns={setMarketingCampaigns}
                                onSelectCampaign={handleSelectCampaign} 
                                onAddNewCampaign={() => setIsCreateCampaignModalOpen(true)}
                           />;
                }
                if (activeSubPage === 'Content Calendar') {
                    return <MarketingContentCalendarPage
                                startupId={startupData.id} 
                                campaigns={marketingCampaigns || []}
                                setCampaigns={setMarketingCampaigns}
                                onAddNewContentItem={() => handleOpenCreateContentItemModal()}
                            />;
                }
                return <MarketingOverviewPage 
                            marketingOverview={startupData.marketing_overview} 
                            campaigns={marketingCampaigns || []} 
                            startupId={startupData.id}
                            onPositioningStatementUpdate={handlePositioningStatementUpdate}
                       />;

            case Scope.WORKSPACE:
                if (activeSubPage === 'Tasks') return <TasksPage tasks={tasks} startupId={startupData.id} setTasks={setTasks} onTaskClick={handleOpenTaskModal} onAddNewTask={() => setIsCreateTaskModalOpen(true)} />;
                if (activeSubPage === 'Experiments') return <ExperimentsPage startupId={startupData.id} experiments={experiments || []} setExperiments={setExperiments} onExperimentClick={handleOpenExperimentModal} onAddNewExperiment={() => setIsCreateExperimentModalOpen(true)} />;
                if (activeSubPage === 'Artifacts') return <ArtifactsPage artifacts={artifacts} startupId={startupData.id} setArtifacts={setArtifacts} onArtifactClick={handleOpenArtifactModal} getLinkedEntityName={getLinkedEntityName} onAddNewArtifact={() => setIsCreateArtifactModalOpen(true)} />;
                return <TasksPage tasks={tasks} startupId={startupData.id} setTasks={setTasks} onTaskClick={handleOpenTaskModal} onAddNewTask={() => setIsCreateTaskModalOpen(true)} />;
             
            case Scope.TEAM:
                return <TeamPage 
                            startupId={startupData.id} 
                            founders={founders} 
                            setFounders={setFounders} 
                            onAddNewFounder={() => setIsCreateFounderModalOpen(true)} 
                            onEditFounder={(founder) => { setSelectedFounderToEdit(founder); setIsEditFounderModalOpen(true); }}
                        />;
            case Scope.SETTINGS:
                return <SettingsPage
                            startupName={startupData.name}
                            startupSlug={startupData.slug}
                            nextMilestone={startupData.next_milestone}
                            onSave={handleUpdateStartupSettings}
                        />;
            default:
                return <DashboardOverview startupData={startupData} />;
        }
    };
    
    const scopeMapping: Record<string, Scope> = {
        Dashboard: Scope.DASHBOARD,
        Product: Scope.PRODUCT,
        Business: Scope.BUSINESS,
        Fundraising: Scope.FUNDRAISING,
        Marketing: Scope.MARKETING,
        Workspace: Scope.WORKSPACE,
        Team: Scope.TEAM,
        Settings: Scope.SETTINGS,
    };
    
    const menuItems = [
        { name: 'Dashboard', icon: Home, subItems: [] },
        { name: 'Product', icon: Package, subItems: ['Products List', 'Product Metrics', 'Issues & Feedback'] },
        { name: 'Business', icon: Briefcase, subItems: ['Overview & Model', 'Monthly Reporting'] },
        { name: 'Fundraising', icon: DollarSign, subItems: ['Overview', 'Funding Rounds', 'Investor CRM'] },
        { name: 'Marketing', icon: Megaphone, subItems: ['Overview', 'Campaigns', 'Content Calendar'] },
        { name: 'Workspace', icon: BookOpen, subItems: ['Tasks', 'Experiments', 'Artifacts'] },
        { name: 'Team', icon: Users, subItems: [] },
        { name: 'Settings', icon: Settings, subItems: [] },
    ];

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen">Error: {error}</div>;
    }

    if (!startupData) {
        return <div className="flex items-center justify-center h-screen">No startup data found.</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            <Sidebar 
                menuItems={menuItems}
                activeScope={activeScope}
                activeSubPage={activeSubPage}
                onNavClick={(scopeName, subPage) => handleNavClick(scopeMapping[scopeName], subPage)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    startupName={startupData.name} 
                    currentStage={startupData.current_stage}
                    user={startupData.user}
                    onCreateClick={handleOpenCreateModal}
                    onSettingsClick={() => handleNavClick(Scope.SETTINGS)}
                    onLogout={handleLogout}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>
            {/* Detail Modals */}
            {isReportModalOpen && selectedReport && (
                <MonthlyReportDetailModal 
                    report={selectedReport}
                    onClose={handleCloseReportModal}
                />
            )}
            {isTaskModalOpen && selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    linkedEntityName={getLinkedEntityName(selectedTask.linked_to_type, selectedTask.linked_to_id)}
                    onClose={handleCloseTaskModal}
                />
            )}
            {isExperimentModalOpen && selectedExperiment && (
                <ExperimentDetailModal
                    experiment={selectedExperiment}
                    linkedEntityName={getLinkedEntityName(selectedExperiment.linked_to_type, selectedExperiment.linked_to_id)}
                    onClose={handleCloseExperimentModal}
                />
            )}
            {isArtifactModalOpen && selectedArtifact && (
                <ArtifactDetailModal
                    artifact={selectedArtifact}
                    linkedEntityName={getLinkedEntityName(selectedArtifact.linked_to_type, selectedArtifact.linked_to_id)}
                    onClose={handleCloseArtifactModal}
                />
            )}

            {/* Create Modals */}
            {isCreateModalOpen && <CreateModal onClose={handleCloseCreateModal} onSelectCreateType={handleSelectCreateType} />}
            {isCreateTaskModalOpen && (
                <CreateTaskModal
                    onClose={() => {
                        setIsCreateTaskModalOpen(false);
                        setSelectedLinkedScope(null); // Reset
                        setSelectedLinkedId(null); // Reset
                    }}
                    onCreate={handleCreateTask}
                    linkableItems={{
                        [Scope.PRODUCT]: (startupData.products || []).map(p => ({ id: p.id, name: p.name })),
                        [Scope.FUNDRAISING]: (startupData.funding_rounds || []).map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
                        [Scope.MARKETING]: (marketingCampaigns || []).map(c => ({ id: c.campaign_id, name: c.campaign_name })),
                        [Scope.GENERAL]: [],
                        [Scope.BUSINESS]: [],
                        [Scope.DASHBOARD]: [],
                        [Scope.WORKSPACE]: [],
                        [Scope.TEAM]: [],
                        [Scope.SETTINGS]: [],
                    }}
                    defaultScope={selectedLinkedScope || undefined}
                    defaultLinkedToId={selectedLinkedId || undefined}
                />
            )}
            {isCreateExperimentModalOpen && (
                <CreateExperimentModal
                    onClose={() => setIsCreateExperimentModalOpen(false)}
                    onCreate={handleCreateExperiment}
                     // FIX: Added missing keys from the Scope enum to satisfy the Record<Scope, LinkableItem[]> type.
                     linkableItems={{
                        [Scope.PRODUCT]: (startupData.products || []).map(p => ({ id: p.id, name: p.name })),
                        [Scope.FUNDRAISING]: (startupData.funding_rounds || []).map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
                        [Scope.MARKETING]: (marketingCampaigns || []).map(c => ({ id: c.campaign_id, name: c.campaign_name })),
                        [Scope.GENERAL]: [],
                        [Scope.BUSINESS]: [],
                        [Scope.DASHBOARD]: [],
                        [Scope.WORKSPACE]: [],
                        [Scope.TEAM]: [],
                        [Scope.SETTINGS]: [],
                    }}
                />
            )}
            {isCreateArtifactModalOpen && (
                <CreateArtifactModal
                    onClose={() => {
                        setIsCreateArtifactModalOpen(false);
                        setSelectedLinkedScope(null); // Reset
                        setSelectedLinkedId(null); // Reset
                    }}
                    onCreate={handleCreateArtifact}
                    // FIX: Added missing keys from the Scope enum to satisfy the Record<Scope, LinkableItem[]> type.
                    linkableItems={{
                        [Scope.PRODUCT]: (startupData.products || []).map(p => ({ id: p.id, name: p.name })),
                        [Scope.FUNDRAISING]: (startupData.funding_rounds || []).map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
                        [Scope.MARKETING]: (marketingCampaigns || []).map(c => ({ id: c.campaign_id, name: c.campaign_name })),
                        [Scope.GENERAL]: [],
                        [Scope.BUSINESS]: [],
                        [Scope.DASHBOARD]: [],
                        [Scope.WORKSPACE]: [],
                        [Scope.TEAM]: [],
                        [Scope.SETTINGS]: [],
                    }}
                    defaultScope={selectedLinkedScope || undefined}
                    defaultLinkedToId={selectedLinkedId || undefined}
                />
            )}
            {isCreateProductModalOpen && (
                <CreateProductModal
                    onClose={() => setIsCreateProductModalOpen(false)}
                    onCreate={handleCreateProduct}
                />
            )}
            {isCreateFeatureModalOpen && selectedProductId && (
                <CreateFeatureModal
                    onClose={() => setIsCreateFeatureModalOpen(false)}
                    onCreate={(data) => handleCreateFeature(data, selectedProductId)}
                />
            )}
            {isCreateMetricModalOpen && (
                <CreateMetricModal
                    onClose={() => setIsCreateMetricModalOpen(false)}
                    onCreate={handleCreateMetric}
                    products={startupData.products}
                    productId={selectedProductId}
                />
            )}
             {isCreateIssueModalOpen && (
                <CreateIssueModal
                    onClose={() => setIsCreateIssueModalOpen(false)}
                    onCreate={handleCreateIssue}
                    products={startupData.products}
                    productId={selectedProductId}
                />
            )}
            {isCreateReportModalOpen && (
                <CreateMonthlyReportModal
                    onClose={() => setIsCreateReportModalOpen(false)}
                    onCreate={handleCreateMonthlyReport}
                />
            )}
            {isCreateFundingRoundModalOpen && (
                <CreateFundingRoundModal
                    onClose={() => setIsCreateFundingRoundModalOpen(false)}
                    onCreate={handleCreateFundingRound}
                />
            )}
            {isCreateInvestorModalOpen && (
                <CreateInvestorModal
                    onClose={() => setIsCreateInvestorModalOpen(false)}
                    onCreate={handleCreateInvestor}
                />
            )}
            {isCreateCampaignModalOpen && (
                <CreateCampaignModal
                    onClose={() => setIsCreateCampaignModalOpen(false)}
                    onCreate={handleCreateCampaign}
                    products={startupData.products}
                />
            )}
            {isCreateContentItemModalOpen && (
                <CreateContentItemModal
                    onClose={() => setIsCreateContentItemModalOpen(false)}
                    onCreate={handleCreateContentItem}
                    campaigns={(marketingCampaigns || []).filter(c => c.content_mode)}
                    defaultCampaignId={selectedCampaignForContent}
                />
            )}
            {isCreateFounderModalOpen && (
                <CreateFounderModal
                    onClose={() => setIsCreateFounderModalOpen(false)}
                    onCreate={handleCreateFounder}
                />
            )}
            {isEditBusinessOverviewModalOpen && startupData?.business_overview && (
                <EditBusinessOverviewModal
                    businessOverview={startupData.business_overview}
                    onClose={() => setIsEditBusinessOverviewModalOpen(false)}
                    onUpdate={handleUpdateBusinessOverview}
                />
            )}
            {isEditFundraisingGoalsModalOpen && startupData?.fundraise_details && (
                <EditFundraisingGoalsModal
                    fundraiseDetails={startupData.fundraise_details}
                    nextFundingGoal={startupData.fundraise_details.next_funding_goal}
                    onClose={() => setIsEditFundraisingGoalsModalOpen(false)}
                    onUpdate={handleUpdateFundraisingGoals}
                />
            )}
            {isEditCampaignModalOpen && selectedCampaignToEdit && startupData?.products && (
                <EditCampaignModal
                    campaign={selectedCampaignToEdit}
                    onClose={() => setIsEditCampaignModalOpen(false)}
                    onUpdate={(updatedData) => handleUpdateCampaign(selectedCampaignToEdit.campaign_id, updatedData)}
                    products={startupData.products}
                />
            )}
            {isEditFounderModalOpen && selectedFounderToEdit && (
                <EditFounderModal
                    founder={selectedFounderToEdit}
                    onClose={() => setIsEditFounderModalOpen(false)}
                    onUpdate={(updatedData) => handleUpdateFounder(selectedFounderToEdit.id, updatedData)}
                />
            )}
            {isEditProductModalOpen && selectedProductToEdit && (
                <EditProductModal
                    product={selectedProductToEdit}
                    onClose={() => setIsEditProductModalOpen(false)}
                    onUpdate={(updatedData) => handleUpdateProduct(selectedProductToEdit.id, updatedData)}
                />
            )}
            {isEditProductBusinessDetailsModalOpen && selectedProductBusinessDetailsToEdit && productIdForBusinessDetailsEdit && (
                <EditProductBusinessDetailsModal
                    productBusinessDetails={selectedProductBusinessDetailsToEdit}
                    onClose={() => setIsEditProductBusinessDetailsModalOpen(false)}
                    onUpdate={(updatedData) => handleUpdateProductBusinessDetails(productIdForBusinessDetailsEdit, updatedData)}
                />
            )}
            {isEditFundingRoundModalOpen && selectedFundingRoundToEdit && (
                <EditFundingRoundModal
                    round={selectedFundingRoundToEdit}
                    onClose={() => setIsEditFundingRoundModalOpen(false)}
                    onUpdate={(updatedData) => handleUpdateFundingRound(selectedFundingRoundToEdit.round_id, updatedData)}
                />
            )}
        </div>
    );
};

export default DashboardPage;