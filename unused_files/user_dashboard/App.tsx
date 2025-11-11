/**
 * @file App.tsx
 * @description The root component of the StartupOS Dashboard application.
 * This component acts as the central hub for state management, routing, and modal control.
 * It fetches the initial startup data and passes it down to the various page components.
 * It also contains all the logic for handling user interactions, such as navigation and
 * creating new data entries (tasks, products, etc.), simulating what would be API calls
 * in a real application.
 */

import React, { useState } from 'react';
// FIX: Import ExperimentStatus to use in handleCreateExperiment.
import { Scope, Startup, BusinessMonthlyData, FundingRound, Task, Experiment, Artifact, LinkedEntityType, Product, Feature, ProductMetric, ProductIssue, ExperimentStatus, Investor, MarketingCampaign, MarketingCampaignStatus, MarketingContentStatus, MarketingContentItem, Founder } from './types';
import { startupData as mockStartupData } from './data';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './pages/DashboardOverview';
import TasksPage from './pages/TasksPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductMetricsPage from './pages/ProductMetricsPage';
import ProductIssuesPage from './pages/ProductIssuesPage';
import BusinessOverviewPage from './pages/BusinessOverviewPage';
import BusinessMonthlyReportingPage from './pages/BusinessMonthlyReportingPage';
import MonthlyReportDetailModal from './components/MonthlyReportDetailModal';
import FundraisingOverviewPage from './pages/FundraisingOverviewPage';
import FundingRoundsPage from './pages/FundingRoundsPage';
import InvestorCrmPage from './pages/InvestorCrmPage';
import FundingRoundDetailPage from './pages/FundingRoundDetailPage';
import MarketingOverviewPage from './pages/MarketingOverviewPage';
import MarketingCampaignsPage from './pages/MarketingCampaignsPage';
import MarketingCampaignDetailPage from './pages/MarketingCampaignDetailPage';
import MarketingContentCalendarPage from './pages/MarketingContentCalendarPage';
import TaskDetailModal from './components/TaskDetailModal';
import ExperimentsPage from './pages/ExperimentsPage';
import ExperimentDetailModal from './components/ExperimentDetailModal';
import ArtifactsPage from './pages/ArtifactsPage';
import ArtifactDetailModal from './components/ArtifactDetailModal';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import { Home, Package, Briefcase, DollarSign, Megaphone, BookOpen, Users, Settings } from 'lucide-react';
import CreateModal from './components/CreateModal';
import CreateTaskModal from './components/CreateTaskModal';
import CreateExperimentModal from './components/CreateExperimentModal';
import CreateArtifactModal from './components/CreateArtifactModal';
import CreateProductModal from './components/CreateProductModal';
import CreateFeatureModal from './components/CreateFeatureModal';
import CreateMetricModal from './components/CreateMetricModal';
import CreateIssueModal from './components/CreateIssueModal';
import CreateMonthlyReportModal from './components/CreateMonthlyReportModal';
import CreateFundingRoundModal from './components/CreateFundingRoundModal';
import CreateInvestorModal from './components/CreateInvestorModal';
import CreateCampaignModal from './components/CreateCampaignModal';
import CreateContentItemModal from './components/CreateContentItemModal';
import CreateFounderModal from './components/CreateFounderModal';

type CreateModalType = 'task' | 'experiment' | 'artifact';

const App: React.FC = () => {
    // --- State Management ---

    /** The main data object for the entire application. In a real app, this would be fetched via an API on component mount. */
    const [startupData, setStartupData] = useState<Startup>(mockStartupData);

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
    const handleLogout = () => {
        alert("Logout action triggered. In a real app, this would clear the user session.");
    };

    const handleSelectProduct = (productId: number) => {
        setSelectedProductId(productId);
        setActiveScope(Scope.PRODUCT);
        setActiveSubPage('Products List');
    };
    
    const handleSelectFundingRound = (roundId: number) => {
        setSelectedFundingRoundId(roundId);
    };

    const handleSelectCampaign = (campaignId: number) => {
        setSelectedCampaignId(campaignId);
    };

    // --- Open/Close Detail Modals ---
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
    const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'startup_id' | 'created_at'>) => {
        const newTask: Task = {
            ...newTaskData,
            id: Date.now(), // Use a real ID from the backend
            startup_id: startupData.id,
            created_at: new Date().toISOString(),
        };
        setStartupData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
        setIsCreateTaskModalOpen(false);
    };
    
    const handleCreateExperiment = (newExperimentData: Omit<Experiment, 'id' | 'startup_id' | 'created_at' | 'status'>) => {
        const newExperiment: Experiment = {
            ...newExperimentData,
            id: Date.now(),
            startup_id: startupData.id,
            created_at: new Date().toISOString(),
            // FIX: Use the ExperimentStatus enum member instead of a string literal.
            status: ExperimentStatus.PLANNED,
        };
        setStartupData(prev => ({ ...prev, experiments: [...prev.experiments, newExperiment] }));
        setIsCreateExperimentModalOpen(false);
    };

    const handleCreateArtifact = (newArtifactData: Omit<Artifact, 'id' | 'startup_id' | 'created_at'>) => {
        const newArtifact: Artifact = {
            ...newArtifactData,
            id: Date.now(),
            startup_id: startupData.id,
            created_at: new Date().toISOString(),
        };
        setStartupData(prev => ({ ...prev, artifacts: [...prev.artifacts, newArtifact] }));
        setIsCreateArtifactModalOpen(false);
    };
    
    const handleCreateProduct = (newProductData: Omit<Product, 'id' | 'startup_id' | 'tech_stack' | 'features' | 'metrics' | 'issues' | 'business_details'>) => {
        const newId = Date.now();
        const newProduct: Product = {
            ...newProductData,
            id: newId,
            startup_id: startupData.id,
            tech_stack: {},
            features: [],
            metrics: [],
            issues: [],
            business_details: {
                product_business_id: newId,
                product_id: newId,
                pricing_model: '', target_customer: '', revenue_streams: '', distribution_channels: '', cost_structure: '',
                // FIX: Corrected typo from `updatedAt` to `updated_at` to match the interface.
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }
        };
        setStartupData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
        setIsCreateProductModalOpen(false);
    };

    const handleCreateFeature = (newFeatureData: Omit<Feature, 'id' | 'product_id'>, productId: number) => {
        const newFeature: Feature = { ...newFeatureData, id: Date.now(), product_id: productId };
        setStartupData(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === productId ? { ...p, features: [...p.features, newFeature] } : p)
        }));
        setIsCreateFeatureModalOpen(false);
    };

    const handleCreateMetric = (newMetricData: Omit<ProductMetric, 'metric_id' | 'product_id' | 'created_at'>, productId: number) => {
        const newMetric: ProductMetric = { ...newMetricData, metric_id: Date.now(), product_id: productId, created_at: new Date().toISOString() };
        setStartupData(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === productId ? { ...p, metrics: [...p.metrics, newMetric] } : p)
        }));
        setIsCreateMetricModalOpen(false);
    };

    const handleCreateIssue = (newIssueData: Omit<ProductIssue, 'issue_id' | 'product_id' | 'created_by' | 'created_at'>, productId: number) => {
        const newIssue: ProductIssue = { ...newIssueData, issue_id: Date.now(), product_id: productId, created_by: 1, created_at: new Date().toISOString() };
        setStartupData(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === productId ? { ...p, issues: [...p.issues, newIssue] } : p)
        }));
        setIsCreateIssueModalOpen(false);
    };

    /**
     * Handles the creation of a new monthly report.
     * @param {Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>} newReportData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateMonthlyReport = (newReportData: Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>) => {
        const newReport: BusinessMonthlyData = {
            ...newReportData,
            record_id: Date.now(), // Use a real ID from the backend
            startup_id: startupData.id,
            created_by: startupData.user_id,
            created_at: new Date().toISOString(),
        };
        setStartupData(prev => ({
            ...prev,
            business_monthly_data: [...prev.business_monthly_data, newReport]
        }));
        setIsCreateReportModalOpen(false);
    };

    /**
     * Handles the creation of a new funding round.
     * @param {Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'round_investors'>} newRoundData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateFundingRound = (newRoundData: Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'round_investors'>) => {
        const newRound: FundingRound = {
            ...newRoundData,
            round_id: Date.now(),
            startup_id: startupData.id,
            created_at: new Date().toISOString(),
            amount_raised: 0,
            valuation_post: newRoundData.valuation_pre + newRoundData.target_amount,
            round_investors: [],
        };
        setStartupData(prev => ({
            ...prev,
            funding_rounds: [...prev.funding_rounds, newRound]
        }));
        setIsCreateFundingRoundModalOpen(false);
    };
    
    /**
     * Handles the creation of a new investor.
     * @param {Omit<Investor, 'investor_id' | 'created_at'>} newInvestorData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateInvestor = (newInvestorData: Omit<Investor, 'investor_id' | 'created_at'>) => {
        const newInvestor: Investor = {
            ...newInvestorData,
            investor_id: Date.now(), // Use a real ID from the backend
            created_at: new Date().toISOString(),
        };
        setStartupData(prev => ({
            ...prev,
            investors: [...prev.investors, newInvestor]
        }));
        setIsCreateInvestorModalOpen(false);
    };
    
    /**
     * Handles the creation of a new marketing campaign.
     * @param {Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar'>} newCampaignData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateCampaign = (newCampaignData: Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar' | 'spend'>) => {
        const newCampaignId = Date.now();
        const newCampaign: MarketingCampaign = {
            ...newCampaignData,
            campaign_id: newCampaignId,
            startup_id: startupData.id,
            created_by: startupData.user_id,
            created_at: new Date().toISOString(),
            spend: 0,
        };

        if (newCampaign.content_mode) {
            newCampaign.content_calendar = {
                calendar_id: Date.now() + 1,
                campaign_id: newCampaignId,
                title: `${newCampaign.campaign_name} Content Plan`,
                description: `Content for the ${newCampaign.campaign_name} campaign.`,
                start_date: newCampaign.start_date,
                end_date: newCampaign.end_date || '',
                owner_id: startupData.user_id,
                created_at: new Date().toISOString(),
                content_items: [],
            }
        }

        setStartupData(prev => ({
            ...prev,
            marketing_campaigns: [...prev.marketing_campaigns, newCampaign]
        }));
        setIsCreateCampaignModalOpen(false);
    };
    
    /**
     * Handles the creation of a new content item.
     * @param {Omit<MarketingContentItem, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>} newContentData - The new content item data.
     * @param {number} campaignId - The ID of the campaign to add the content to.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateContentItem = (newContentData: Omit<MarketingContentItem, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>, campaignId: number) => {
        setStartupData(prev => {
            const campaigns = prev.marketing_campaigns.map(c => {
                if (c.campaign_id === campaignId && c.content_calendar) {
                    const newContentItem: MarketingContentItem = {
                        ...newContentData,
                        content_id: Date.now(),
                        calendar_id: c.content_calendar.calendar_id,
                        created_by: prev.user_id,
                        created_at: new Date().toISOString(),
                    };
                    const updatedCalendar = {
                        ...c.content_calendar,
                        content_items: [...c.content_calendar.content_items, newContentItem]
                    };
                    return { ...c, content_calendar: updatedCalendar };
                }
                return c;
            });
            return { ...prev, marketing_campaigns: campaigns };
        });
        setIsCreateContentItemModalOpen(false);
    };

    /**
     * Handles the creation of a new founder.
     * @param {Omit<Founder, 'id' | 'startup_id'>} newFounderData - Data from the creation modal.
     * @backend This function should be replaced with a POST API call to the backend.
     */
    const handleCreateFounder = (newFounderData: Omit<Founder, 'id' | 'startup_id'>) => {
        const newFounder: Founder = {
            ...newFounderData,
            id: Date.now(), // Use a real ID from the backend
            startup_id: startupData.id,
        };
        setStartupData(prev => ({
            ...prev,
            founders: [...prev.founders, newFounder]
        }));
        setIsCreateFounderModalOpen(false);
    };

    /**
     * Handles saving updated startup settings.
     * @param {{ name: string; slug: string; next_milestone: string }} updatedSettings - The new settings values.
     * @backend This function should be replaced with a PUT/PATCH API call to the backend.
     */
    const handleUpdateStartupSettings = (updatedSettings: { name: string; slug: string; next_milestone: string }) => {
        setStartupData(prev => ({
            ...prev,
            name: updatedSettings.name,
            slug: updatedSettings.slug,
            next_milestone: updatedSettings.next_milestone,
        }));
        // Here you would typically show a success notification
        console.log('Startup settings updated:', updatedSettings);
    };


    const handleBackToList = () => setSelectedProductId(null);
    const handleBackToRoundsList = () => setSelectedFundingRoundId(null);
    const handleBackToCampaignsList = () => setSelectedCampaignId(null);
    
    /**
     * Finds the name of a linked entity (Product, FundingRound, etc.) by its type and ID.
     * Used to provide context in detail modals.
     */
    const getLinkedEntityName = (type?: LinkedEntityType, id?: number): string | null => {
        if (!type || !id) return null;
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


    /**
     * Main content router for the application.
     * Renders the correct page component based on the `activeScope` and `activeSubPage` state.
     */
    const renderContent = () => {
        switch (activeScope) {
            case Scope.DASHBOARD:
                return <DashboardOverview startupData={startupData} />;
            
            case Scope.PRODUCT:
                if (activeSubPage === 'Products List') {
                    const selectedProduct = startupData.products.find(p => p.id === selectedProductId);
                    if (selectedProduct) {
                        return <ProductDetailPage 
                            product={selectedProduct}
                            linkedTasks={startupData.tasks.filter(t => t.linked_to_type === 'Product' && t.linked_to_id === selectedProduct.id)}
                            linkedExperiments={startupData.experiments.filter(e => e.linked_to_type === 'Product' && e.linked_to_id === selectedProduct.id)}
                            linkedArtifacts={startupData.artifacts.filter(a => a.linked_to_type === 'Product' && a.linked_to_id === selectedProduct.id)}
                            onBack={handleBackToList}
                            onAddFeature={() => setIsCreateFeatureModalOpen(true)}
                            onAddMetric={() => setIsCreateMetricModalOpen(true)}
                            onAddIssue={() => setIsCreateIssueModalOpen(true)}
                        />;
                    }
                    return <ProductListPage products={startupData.products} onSelectProduct={handleSelectProduct} onAddNewProduct={() => setIsCreateProductModalOpen(true)} />;
                }
                if (activeSubPage === 'Product Metrics') {
                    return <ProductMetricsPage products={startupData.products} onAddNewMetric={() => setIsCreateMetricModalOpen(true)} />;
                }
                if (activeSubPage === 'Issues & Feedback') {
                    return <ProductIssuesPage products={startupData.products} onAddNewIssue={() => setIsCreateIssueModalOpen(true)} />;
                }
                return <ProductListPage products={startupData.products} onSelectProduct={handleSelectProduct} onAddNewProduct={() => setIsCreateProductModalOpen(true)} />;

            case Scope.BUSINESS:
                 if (activeSubPage === 'Overview & Model') {
                    return <BusinessOverviewPage 
                                businessOverview={startupData.business_overview} 
                                monthlyData={startupData.business_monthly_data} 
                           />;
                }
                 if (activeSubPage === 'Monthly Reporting') {
                    return <BusinessMonthlyReportingPage 
                                monthlyData={startupData.business_monthly_data}
                                onRowClick={handleOpenReportModal}
                                onAddNewReport={() => setIsCreateReportModalOpen(true)}
                           />;
                }
                return <BusinessOverviewPage 
                            businessOverview={startupData.business_overview}
                            monthlyData={startupData.business_monthly_data}
                       />;
            
            case Scope.FUNDRAISING:
                if (activeSubPage === 'Overview') {
                    return <FundraisingOverviewPage fundraiseDetails={startupData.fundraise_details} />;
                }
                if (activeSubPage === 'Funding Rounds') {
                    const selectedRound = startupData.funding_rounds.find(r => r.round_id === selectedFundingRoundId);
                    if (selectedRound) {
                        return <FundingRoundDetailPage 
                                    round={selectedRound}
                                    investors={startupData.investors}
                                    linkedTasks={startupData.tasks.filter(t => t.linked_to_type === 'FundingRound' && t.linked_to_id === selectedRound.round_id)}
                                    linkedArtifacts={startupData.artifacts.filter(a => a.linked_to_type === 'FundingRound' && a.linked_to_id === selectedRound.round_id)}
                                    onBack={handleBackToRoundsList}
                               />
                    }
                    return <FundingRoundsPage 
                                fundingRounds={startupData.funding_rounds}
                                onSelectRound={handleSelectFundingRound} 
                                onAddNewRound={() => setIsCreateFundingRoundModalOpen(true)}
                           />;
                }
                if (activeSubPage === 'Investor CRM') {
                    return <InvestorCrmPage 
                                investors={startupData.investors}
                                onAddNewInvestor={() => setIsCreateInvestorModalOpen(true)} 
                           />;
                }
                return <FundraisingOverviewPage fundraiseDetails={startupData.fundraise_details} />;

            case Scope.MARKETING:
                if (activeSubPage === 'Overview') {
                    return <MarketingOverviewPage 
                                marketingOverview={startupData.marketing_overview} 
                                campaigns={startupData.marketing_campaigns}
                            />;
                }
                if (activeSubPage === 'Campaigns') {
                    const selectedCampaign = startupData.marketing_campaigns.find(c => c.campaign_id === selectedCampaignId);
                     if (selectedCampaign) {
                        return <MarketingCampaignDetailPage 
                                    campaign={selectedCampaign}
                                    linkedTasks={startupData.tasks.filter(t => t.linked_to_type === 'MarketingCampaign' && t.linked_to_id === selectedCampaign.campaign_id)}
                                    linkedArtifacts={startupData.artifacts.filter(a => a.linked_to_type === 'MarketingCampaign' && a.linked_to_id === selectedCampaign.campaign_id)}
                                    onBack={handleBackToCampaignsList}
                                    onAddContentItem={() => handleOpenCreateContentItemModal(selectedCampaign.campaign_id)}
                               />
                    }
                    return <MarketingCampaignsPage 
                                campaigns={startupData.marketing_campaigns}
                                onSelectCampaign={handleSelectCampaign} 
                                onAddNewCampaign={() => setIsCreateCampaignModalOpen(true)}
                           />;
                }
                if (activeSubPage === 'Content Calendar') {
                    return <MarketingContentCalendarPage 
                                campaigns={startupData.marketing_campaigns} 
                                onAddNewContentItem={() => handleOpenCreateContentItemModal()}
                            />;
                }
                return <MarketingOverviewPage 
                            marketingOverview={startupData.marketing_overview} 
                            campaigns={startupData.marketing_campaigns} 
                       />;

            case Scope.WORKSPACE:
                if (activeSubPage === 'Tasks') return <TasksPage tasks={startupData.tasks} onTaskClick={handleOpenTaskModal} onAddNewTask={() => setIsCreateTaskModalOpen(true)} />;
                if (activeSubPage === 'Experiments') return <ExperimentsPage experiments={startupData.experiments} onExperimentClick={handleOpenExperimentModal} onAddNewExperiment={() => setIsCreateExperimentModalOpen(true)} />;
                if (activeSubPage === 'Artifacts') return <ArtifactsPage artifacts={startupData.artifacts} onArtifactClick={handleOpenArtifactModal} getLinkedEntityName={getLinkedEntityName} onAddNewArtifact={() => setIsCreateArtifactModalOpen(true)} />;
                return <TasksPage tasks={startupData.tasks} onTaskClick={handleOpenTaskModal} onAddNewTask={() => setIsCreateTaskModalOpen(true)} />;
             
            case Scope.TEAM:
                return <TeamPage founders={startupData.founders} onAddNewFounder={() => setIsCreateFounderModalOpen(true)} />;
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
                    onClose={() => setIsCreateTaskModalOpen(false)}
                    onCreate={handleCreateTask}
                    // FIX: Added missing keys from the Scope enum to satisfy the Record<Scope, LinkableItem[]> type.
                    linkableItems={{
                        [Scope.PRODUCT]: startupData.products.map(p => ({ id: p.id, name: p.name })),
                        [Scope.FUNDRAISING]: startupData.funding_rounds.map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
                        [Scope.MARKETING]: startupData.marketing_campaigns.map(c => ({ id: c.campaign_id, name: c.campaign_name })),
                        [Scope.GENERAL]: [],
                        [Scope.BUSINESS]: [],
                        [Scope.DASHBOARD]: [],
                        [Scope.WORKSPACE]: [],
                        [Scope.TEAM]: [],
                        [Scope.SETTINGS]: [],
                    }}
                />
            )}
            {isCreateExperimentModalOpen && (
                <CreateExperimentModal
                    onClose={() => setIsCreateExperimentModalOpen(false)}
                    onCreate={handleCreateExperiment}
                     // FIX: Added missing keys from the Scope enum to satisfy the Record<Scope, LinkableItem[]> type.
                     linkableItems={{
                        [Scope.PRODUCT]: startupData.products.map(p => ({ id: p.id, name: p.name })),
                        [Scope.FUNDRAISING]: startupData.funding_rounds.map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
                        [Scope.MARKETING]: startupData.marketing_campaigns.map(c => ({ id: c.campaign_id, name: c.campaign_name })),
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
                    onClose={() => setIsCreateArtifactModalOpen(false)}
                    onCreate={handleCreateArtifact}
                    // FIX: Added missing keys from the Scope enum to satisfy the Record<Scope, LinkableItem[]> type.
                    linkableItems={{
                        [Scope.PRODUCT]: startupData.products.map(p => ({ id: p.id, name: p.name })),
                        [Scope.FUNDRAISING]: startupData.funding_rounds.map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
                        [Scope.MARKETING]: startupData.marketing_campaigns.map(c => ({ id: c.campaign_id, name: c.campaign_name })),
                        [Scope.GENERAL]: [],
                        [Scope.BUSINESS]: [],
                        [Scope.DASHBOARD]: [],
                        [Scope.WORKSPACE]: [],
                        [Scope.TEAM]: [],
                        [Scope.SETTINGS]: [],
                    }}
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
                    campaigns={startupData.marketing_campaigns.filter(c => c.content_mode)}
                    defaultCampaignId={selectedCampaignForContent}
                />
            )}
            {isCreateFounderModalOpen && (
                <CreateFounderModal
                    onClose={() => setIsCreateFounderModalOpen(false)}
                    onCreate={handleCreateFounder}
                />
            )}
        </div>
    );
};

export default App;