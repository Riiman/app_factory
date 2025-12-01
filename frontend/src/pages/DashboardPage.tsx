
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scope, Startup, BusinessMonthlyData, FundingRound, Task, Experiment, Artifact, Product, Founder, MarketingCampaign, ProductMetric, ProductBusinessDetails, Investor, ActivityLog, DashboardNotification, Feature, Fundraise } from '@/types/dashboard-types';
import api from '@/utils/api';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import DashboardOverview from './dashboard/DashboardOverview';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
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
import EditMetricModal from '@/components/dashboard/EditMetricModal';
import EditFeatureModal from '@/components/dashboard/EditFeatureModal';

import { useAuth } from '@/contexts/AuthContext';
import { BusinessOverview } from '@/types/dashboard-types';

type CreateModalType = 'task' | 'experiment' | 'artifact';

const DashboardPage: React.FC = () => {
    const { user, isLoading: authLoading, handleLogout } = useAuth();

    // --- React Query for Data Fetching ---
    const { data: startup, isLoading: isQueryLoading, isError, error } = useQuery<Startup, Error>({
        queryKey: ['startupData', user?.startup_id],
        queryFn: async () => {
            if (!user?.startup_id) throw new Error("Startup ID not found");
            const data = await api.getStartupData(user.startup_id);
            // Also fetch marketing overview and merge it
            const marketingOverview = await api.getMarketingOverview(user.startup_id);
            const activity = await api.getRecentActivity(user.startup_id);
            const notifications = await api.getNotifications();
            return { ...data, marketing_overview: marketingOverview, activity, notifications };
        },
        enabled: !!user?.startup_id,
        // Refetch data on window focus for consistency
        refetchOnWindowFocus: true,
    });

    const isLoading = authLoading || (!!user?.startup_id && isQueryLoading);

    // --- Local State for UI rendering (populated by useQuery) ---
    // These act as a bridge until all create/update handlers are also refactored
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
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

    useEffect(() => {
        if (startup) {
            setStartupData(startup);
            setTasks(startup.tasks || []);
            setExperiments(startup.experiments || []);
            setArtifacts(startup.artifacts || []);
            setProducts(startup.products || []);
            setMonthlyReports(startup.monthly_data || []);
            setFundingRounds(startup.funding_rounds || []);
            setInvestors(startup.investors || []);
            setFounders(startup.founders || []);
            setMarketingCampaigns(startup.marketing_campaigns || []);
            setActivity(startup.activity || []);
            setNotifications(startup.notifications || []);
        }
    }, [startup]);


    // --- UI State (Navigation, Modals, etc.) ---
    const [activeScope, setActiveScope] = useState<Scope>(Scope.DASHBOARD);
    const [activeSubPage, setActiveSubPage] = useState<string>('Overview');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedFundingRoundId, setSelectedFundingRoundId] = useState<number | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<BusinessMonthlyData | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isExperimentModalOpen, setIsExperimentModalOpen] = useState(false);
    const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
    const [isArtifactModalOpen, setIsArtifactModalOpen] = useState(false);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    // ... (rest of the modal state remains the same)
    const [isCreateExperimentModalOpen, setIsCreateExperimentModalOpen] = useState(false);
    const [isCreateArtifactModalOpen, setIsCreateArtifactModalOpen] = useState(false);
    const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
    const [isCreateFeatureModalOpen, setIsCreateFeatureModalOpen] = useState(false);
    const [isCreateMetricModalOpen, setIsCreateMetricModalOpen] = useState(false);
    const [isCreateIssueModalOpen, setIsCreateIssueModalOpen] = useState(false);
    const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
    const [isCreateFundingRoundModalOpen, setIsCreateFundingRoundModalOpen] = useState(false);
    const [isCreateInvestorModalOpen, setIsCreateInvestorModalOpen] = useState(false);
    const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
    const [isCreateContentItemModalOpen, setIsCreateContentItemModalOpen] = useState(false);
    const [selectedCampaignForContent, setSelectedCampaignForContent] = useState<number | null>(null);
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
    const [isEditMetricModalOpen, setIsEditMetricModalOpen] = useState(false);
    const [selectedMetricToEdit, setSelectedMetricToEdit] = useState<ProductMetric | null>(null);
    const [productIdForMetricEdit, setProductIdForMetricEdit] = useState<number | null>(null);
    const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);
    const [selectedFeatureToEdit, setSelectedFeatureToEdit] = useState<Feature | null>(null);
    const [productIdForFeatureEdit, setProductIdForFeatureEdit] = useState<number | null>(null);

    // --- Handlers and Component Logic (remains largely the same) ---
    // NOTE: The create/update/delete handlers still use manual state updates.
    // A future refactor would be to replace them with `useMutation` and query invalidation.
    const handleNavClick = (scope: Scope, subPage: string = 'Overview') => {
        // ... same as before
        setActiveScope(scope);
        setActiveSubPage(subPage);
        setSelectedProductId(null);
        setSelectedFundingRoundId(null);
        setSelectedCampaignId(null);
    };
    const handleSelectCampaign = (campaignId: number) => setSelectedCampaignId(campaignId);
    const handleSelectProduct = (productId: number) => {
        setSelectedProductId(productId);
        setActiveScope(Scope.PRODUCT);
        setActiveSubPage('Products List');
    };
    const handleSelectFundingRound = (roundId: number) => setSelectedFundingRoundId(roundId);
    const handleOpenReportModal = (report: BusinessMonthlyData) => { setSelectedReport(report); setIsReportModalOpen(true); };
    const handleCloseReportModal = () => { setIsReportModalOpen(false); setSelectedReport(null); };
    const handleOpenTaskModal = (task: Task) => { setSelectedTask(task); setIsTaskModalOpen(true); };
    const handleCloseTaskModal = () => { setIsTaskModalOpen(false); setSelectedTask(null); };
    const handleOpenExperimentModal = (experiment: Experiment) => { setSelectedExperiment(experiment); setIsExperimentModalOpen(true); };
    const handleCloseExperimentModal = () => { setIsExperimentModalOpen(false); setSelectedExperiment(null); };
    const handleOpenArtifactModal = (artifact: Artifact) => { setSelectedArtifact(artifact); setIsArtifactModalOpen(true); };
    const handleCloseArtifactModal = () => { setIsArtifactModalOpen(false); setSelectedArtifact(null); };
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
    };

    // --- Create/Update/Delete Handlers (Unchanged for now) ---
    const handleCreateTask = async (newTaskData: Omit<Task, 'id' | 'startup_id' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newTask = await api.createTask(startupData.id, newTaskData);
            setTasks(prev => [...(prev || []), newTask]);
            setIsCreateTaskModalOpen(false);
        } catch (error) { console.error("Failed to create task:", error); }
    };
    // ... all other handleCreate, handleUpdate, handleDelete functions remain the same for now...
    const handleCreateExperiment = async (newExperimentData: Omit<Experiment, 'id' | 'startup_id' | 'created_at' | 'status'>) => {
        if (!startupData) return;
        try {
            const newExperiment = await api.createExperiment(startupData.id, newExperimentData);
            setExperiments(prev => [...(prev || []), newExperiment]);
            setIsCreateExperimentModalOpen(false);
        } catch (error) { console.error("Failed to create experiment:", error); }
    };
    const handleCreateArtifact = async (newArtifactData: Omit<Artifact, 'id' | 'startup_id' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newArtifact = await api.createArtifact(startupData.id, newArtifactData);
            setArtifacts(prev => [...(prev || []), newArtifact]);
            setIsCreateArtifactModalOpen(false);
        } catch (error) { console.error("Failed to create artifact:", error); }
    };
    const handleCreateProduct = async (newProductData: Omit<Product, 'id' | 'startup_id' | 'tech_stack' | 'features' | 'metrics' | 'issues' | 'business_details'>) => {
        if (!startupData) return;
        try {
            const newProduct = await api.createProduct(startupData.id, newProductData);
            setProducts(prev => [...(prev || []), newProduct]);
            setIsCreateProductModalOpen(false);
        } catch (error) { console.error("Failed to create product:", error); }
    };
    const handleCreateFeature = async (newFeatureData: Omit<any, 'id' | 'product_id'>, productId: number) => {
        if (!startupData) return;
        try {
            const newFeature = await api.createFeature(startupData.id, productId, newFeatureData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? { ...p, features: [...p.features, newFeature] } : p) : null);
            setIsCreateFeatureModalOpen(false);
        } catch (error) { console.error("Failed to create feature:", error); }
    };
    const handleCreateMetric = async (newMetricData: Omit<ProductMetric, 'metric_id' | 'product_id'>, productId: number) => {
        if (!startupData) return;
        try {
            const newMetric = await api.createMetric(startupData.id, productId, newMetricData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? { ...p, product_metrics: [...p.product_metrics, newMetric] } : p) : null);
            setIsCreateMetricModalOpen(false);
        } catch (error) { console.error("Failed to create metric:", error); }
    };
    const handleCreateIssue = async (newIssueData: Omit<any, 'issue_id' | 'product_id' | 'created_by' | 'created_at'>, productId: number) => {
        if (!startupData) return;
        try {
            const newIssue = await api.createIssue(startupData.id, productId, newIssueData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? { ...p, product_issues: [...p.product_issues, newIssue] } : p) : null);
            setIsCreateIssueModalOpen(false);
        } catch (error) { console.error("Failed to create issue:", error); }
    };
    const handleCreateMonthlyReport = async (newReportData: Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newReport = await api.createMonthlyReport(startupData.id, newReportData);
            setMonthlyReports(prev => [...(prev || []), newReport]);
            setIsCreateReportModalOpen(false);
        } catch (error) { console.error("Failed to create monthly report:", error); }
    };
    const handleCreateFundingRound = async (newRoundData: Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'investors'>) => {
        if (!startupData) return;
        try {
            const newRound = await api.createFundingRound(startupData.id, newRoundData);
            setFundingRounds(prev => [...(prev || []), newRound]);
            setIsCreateFundingRoundModalOpen(false);
        } catch (error) { console.error("Failed to create funding round:", error); }
    };
    const handleCreateInvestor = async (newInvestorData: Omit<Investor, 'investor_id' | 'created_at'>) => {
        if (!startupData) return;
        try {
            const newInvestor = await api.createInvestor(startupData.id, newInvestorData);
            setInvestors(prev => [...(prev || []), newInvestor]);
            setIsCreateInvestorModalOpen(false);
        } catch (error) { console.error("Failed to create investor:", error); }
    };
    const handleCreateCampaign = async (newCampaignData: Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar' | 'spend'>) => {
        if (!startupData) return;
        try {
            const newCampaign = await api.createCampaign(startupData.id, newCampaignData);
            setMarketingCampaigns(prev => [...(prev || []), { ...newCampaign, content_mode: newCampaignData.content_mode }]);
            setIsCreateCampaignModalOpen(false);
        } catch (error) { console.error("Failed to create campaign:", error); }
    };
    const handleCreateContentItem = async (newContentData: Omit<any, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>, campaignId: number) => {
        if (!startupData) return;
        try {
            const newItem = await api.createContentItem(startupData.id, campaignId, newContentData);
            setMarketingCampaigns(prev => {
                if (!prev) return null;
                return prev.map(c => {
                    if (c.campaign_id === campaignId && c.content_calendars && c.content_calendars.length > 0) {
                        const updatedContentCalendars = c.content_calendars.map((calendar, index) => {
                            if (index === 0) { return { ...calendar, content_items: [...calendar.content_items, newItem] }; }
                            return calendar;
                        });
                        return { ...c, content_calendars: updatedContentCalendars };
                    }
                    return c;
                });
            });
            setIsCreateContentItemModalOpen(false);
        } catch (error) { console.error("Failed to create content item:", error); }
    };
    const handleCreateFounder = async (newFounderData: Omit<Founder, 'id' | 'startup_id'>) => {
        if (!startupData) return;
        try {
            const response = await api.createFounder(startupData.id, newFounderData);
            setFounders(prev => [...(prev || []), response.founder]);
            setIsCreateFounderModalOpen(false);
        } catch (error) { console.error("Failed to create founder:", error); }
    };
    const handleUpdateStartupSettings = async (updatedSettings: { name: string; slug: string; next_milestone: string }) => {
        if (!startupData) return;
        try {
            const updatedStartup = await api.updateStartupSettings(startupData.id, updatedSettings);
            setStartupData(updatedStartup);
        } catch (error) { console.error("Failed to update startup settings:", error); }
    };
    const handleUpdateBusinessOverview = async (updatedData: Partial<BusinessOverview>) => {
        if (!startupData) return;
        try {
            const updatedBusinessOverview = await api.updateBusinessOverview(startupData.id, updatedData);
            setStartupData(prev => prev ? ({ ...prev, business_overview: updatedBusinessOverview }) : null);
            setIsEditBusinessOverviewModalOpen(false);
        } catch (error) { console.error("Failed to update business overview:", error); }
    };
    const handleUpdateFundraisingGoals = async (updatedFundraiseData: Partial<Fundraise>, updatedNextFundingGoalData: Partial<any>) => {
        if (!startupData) return;
        try {
            const response = await api.updateFundraisingGoals(startupData.id, updatedFundraiseData, updatedNextFundingGoalData);
            setStartupData(prev => prev ? ({ ...prev, fundraise_details: response.fundraise_details }) : null);
            setIsEditFundraisingGoalsModalOpen(false);
        } catch (error) { console.error("Failed to update fundraising goals:", error); }
    };
    const handleUpdateCampaign = async (campaignId: number, updatedData: Partial<MarketingCampaign>) => {
        if (!startupData) return;
        try {
            const response = await api.updateCampaign(startupData.id, campaignId, updatedData);
            setMarketingCampaigns(prev => prev ? prev.map(c => c.campaign_id === campaignId ? response.campaign : c) : null);
            setIsEditCampaignModalOpen(false);
        } catch (error) { console.error("Failed to update campaign:", error); }
    };
    const handleUpdateFounder = async (founderId: number, updatedData: Partial<Founder>) => {
        if (!startupData) return;
        try {
            const response = await api.updateFounder(startupData.id, founderId, updatedData);
            setFounders(prev => prev ? prev.map(f => f.id === founderId ? response.founder : f) : null);
            setIsEditFounderModalOpen(false);
        } catch (error) { console.error("Failed to update founder:", error); }
    };
    const handleDeleteFounder = async (founderId: number) => {
        if (!startupData) return;
        try {
            await api.deleteFounder(startupData.id, founderId);
            setFounders(prev => prev ? prev.filter(f => f.id !== founderId) : null);
        } catch (error) { console.error("Failed to delete founder:", error); }
    };
    const handleUpdateProduct = async (productId: number, updatedData: Partial<Product>) => {
        if (!startupData) return;
        try {
            const response = await api.updateProduct(startupData.id, productId, updatedData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? response.product : p) : null);
            setIsEditProductModalOpen(false);
        } catch (error) { console.error("Failed to update product:", error); }
    };
    const handleUpdateProductBusinessDetails = async (productId: number, updatedData: Partial<ProductBusinessDetails>) => {
        if (!startupData) return;
        try {
            const response = await api.updateProductBusinessDetails(startupData.id, productId, updatedData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? { ...p, business_details: response.product_business_details } : p) : null);
            setIsEditProductBusinessDetailsModalOpen(false);
        } catch (error) { console.error("Failed to update product business details:", error); }
    };
    const handleUpdateFundingRound = async (roundId: number, updatedData: Partial<FundingRound>) => {
        if (!startupData) return;
        try {
            const response = await api.updateFundingRound(startupData.id, roundId, updatedData);
            setFundingRounds(prev => prev ? prev.map(r => r.round_id === roundId ? response.round : r) : null);
            setIsEditFundingRoundModalOpen(false);
        } catch (error) { console.error("Failed to update funding round:", error); }
    };
    const handleUpdateMetric = async (productId: number, metricId: number, updatedData: Partial<ProductMetric>) => {
        if (!startupData) return;
        try {
            const response = await api.updateMetric(startupData.id, productId, metricId, updatedData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? { ...p, product_metrics: p.product_metrics.map(m => m.metric_id === metricId ? response.metric : m) } : p) : null);
            setIsEditMetricModalOpen(false);
        } catch (error) { console.error("Failed to update metric:", error); }
    };
    const handleUpdateFeature = async (productId: number, featureId: number, updatedData: Partial<Feature>) => {
        if (!startupData) return;
        try {
            const response = await api.updateFeature(startupData.id, productId, featureId, updatedData);
            setProducts(prev => prev ? prev.map(p => p.id === productId ? { ...p, features: p.features.map(f => f.id === featureId ? response : f) } : p) : null);
            setIsEditFeatureModalOpen(false);
        } catch (error) { console.error("Failed to update feature:", error); }
    };
    const handleBackToList = () => setSelectedProductId(null);
    const handleBackToRoundsList = () => setSelectedFundingRoundId(null);
    const handleBackToCampaignsList = () => setSelectedCampaignId(null);
    const getLinkedEntityName = (type?: string, id?: number): string | null => {
        // ... same as before
        if (!type || !id || !startupData) return null;
        switch (type) {
            case 'Product': return startupData.products.find(p => p.id === id)?.name || null;
            case 'FundingRound': return startupData.funding_rounds.find(r => r.round_id === id)?.round_type || null;
            case 'MarketingCampaign': return startupData.marketing_campaigns.find(c => c.campaign_id === id)?.campaign_name || null;
            default: return null;
        }
    };
    const handlePositioningStatementUpdate = (newStatement: string) => {
        // ... same as before
        setStartupData(prev => {
            if (!prev) return null;
            const newMarketingOverview = prev.marketing_overview ? { ...prev.marketing_overview, positioning_statement: newStatement } : { marketing_id: 0, startup_id: prev.id, positioning_statement: newStatement };
            return { ...prev, marketing_overview: newMarketingOverview };
        });
    };

    const handleMarkNotificationAsRead = async (id: number) => {
        try {
            await api.markNotificationAsRead(id);
            // Optimistically update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) { console.error("Failed to mark notification as read:", error); }
    };

    // --- Render Logic ---
    const renderContent = () => {
        // ... This function remains the same, but it will now use the local state
        // that is populated by the useEffect listening to the `useQuery` data.
        if (!startupData) return null;
        // ... same switch statement as before
        switch (activeScope) {
            case Scope.DASHBOARD:
                return <DashboardOverview startupData={{ ...startupData, monthly_data: monthlyReports || [] }} recentActivity={activity} />;

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
                            onEditMetric={(productId, metric) => {
                                setProductIdForMetricEdit(productId);
                                setSelectedMetricToEdit(metric);
                                setIsEditMetricModalOpen(true);
                            }}
                            onEditFeature={(productId, feature) => {
                                setProductIdForFeatureEdit(productId);
                                setSelectedFeatureToEdit(feature);
                                setIsEditFeatureModalOpen(true);
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
                } if (activeSubPage === 'Monthly Reporting') {
                    return <BusinessMonthlyReportingPage
                        startupId={startupData.id}
                        monthlyData={monthlyReports || []}
                        setMonthlyData={setMonthlyReports}
                        onRowClick={handleOpenReportModal}
                        onAddNewReport={() => setIsCreateReportModalOpen(true)}
                    />;
                }
                return <BusinessOverviewPage
                    businessOverview={startupData.business_overview || {} as BusinessOverview}
                    monthlyData={monthlyReports || []}
                    onEdit={() => setIsEditBusinessOverviewModalOpen(true)}
                />; case Scope.FUNDRAISING:
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
                            onAddInvestor={(roundId) => { setIsCreateInvestorModalOpen(true); }}
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
                return <FundraisingOverviewPage fundraiseDetails={startupData.fundraise_details} onEdit={() => setIsEditFundraisingGoalsModalOpen(true)} />;

            case Scope.MARKETING:
                const selectedCampaign = (marketingCampaigns || []).find(c => c.campaign_id === selectedCampaignId);
                if (activeSubPage === 'Overview') {
                    return <MarketingOverviewPage
                        marketingOverview={startupData.marketing_overview}
                        campaigns={marketingCampaigns || []}
                        startupId={startupData.id}
                        onPositioningStatementUpdate={handlePositioningStatementUpdate}
                    />;
                }
                if (activeSubPage === 'Campaigns') {
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
                    onDeleteFounder={handleDeleteFounder}
                />;
            case Scope.SETTINGS:
                return <SettingsPage
                    startupName={startupData.name}
                    startupSlug={startupData.slug}
                    nextMilestone={startupData.next_milestone}
                    onSave={handleUpdateStartupSettings}
                />;
            default:
                return <DashboardOverview startupData={startupData} recentActivity={activity} />;
        }
    };

    const scopeMapping: Record<string, Scope> = {
        'Dashboard': Scope.DASHBOARD,
        'Product': Scope.PRODUCT,
        'Business': Scope.BUSINESS,
        'Fundraising': Scope.FUNDRAISING,
        'Marketing': Scope.MARKETING,
        'Workspace': Scope.WORKSPACE,
        'Team': Scope.TEAM,
        'Settings': Scope.SETTINGS
    };

    const menuItems = [
        { name: 'Dashboard', icon: Home, subItems: [] },
        { name: 'Product', icon: Package, subItems: ['Products List', 'Product Metrics', 'Issues & Feedback'] },
        { name: 'Business', icon: Briefcase, subItems: ['Overview & Model', 'Monthly Reporting'] },
        { name: 'Fundraising', icon: DollarSign, subItems: ['Overview', 'Funding Rounds', 'Investor CRM'] },
        { name: 'Marketing', icon: Megaphone, subItems: ['Overview', 'Campaigns', 'Content Calendar'] },
        { name: 'Workspace', icon: BookOpen, subItems: ['Tasks', 'Experiments', 'Artifacts'] },
        { name: 'Team', icon: Users, subItems: [] },
        { name: 'Settings', icon: Settings, subItems: [] }
    ];

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (isError) {
        return <div className="flex items-center justify-center h-screen">Error: {error.message}</div>;
    }

    if (!startup || !startupData) {
        return <div className="flex items-center justify-center h-screen">Loading startup data...</div>;
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
                    notificationCenter={<NotificationCenter notifications={notifications} onMarkAsRead={handleMarkNotificationAsRead} />}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>
            {/* All modals remain here, unchanged */}
            {isReportModalOpen && selectedReport && <MonthlyReportDetailModal report={selectedReport} onClose={handleCloseReportModal} />}
            {isTaskModalOpen && selectedTask && <TaskDetailModal task={selectedTask} linkedEntityName={getLinkedEntityName(selectedTask.linked_to_type, selectedTask.linked_to_id)} onClose={handleCloseTaskModal} />}
            {isExperimentModalOpen && selectedExperiment && <ExperimentDetailModal experiment={selectedExperiment} linkedEntityName={getLinkedEntityName(selectedExperiment.linked_to_type, selectedExperiment.linked_to_id)} onClose={handleCloseExperimentModal} />}
            {isArtifactModalOpen && selectedArtifact && <ArtifactDetailModal artifact={selectedArtifact} linkedEntityName={getLinkedEntityName(selectedArtifact.linked_to_type, selectedArtifact.linked_to_id)} onClose={handleCloseArtifactModal} />}
            {isCreateModalOpen && <CreateModal onClose={handleCloseCreateModal} onSelectCreateType={handleSelectCreateType} />}
            {isCreateTaskModalOpen && <CreateTaskModal onClose={() => { setIsCreateTaskModalOpen(false); setSelectedLinkedScope(null); setSelectedLinkedId(null); }} onCreate={handleCreateTask} linkableItems={{ [Scope.PRODUCT]: (startupData.products || []).map(p => ({ id: p.id, name: p.name })), [Scope.FUNDRAISING]: (startupData.funding_rounds || []).map(r => ({ id: r.round_id, name: `${r.round_type} Round` })), [Scope.MARKETING]: (marketingCampaigns || []).map(c => ({ id: c.campaign_id, name: c.campaign_name })), [Scope.GENERAL]: [], [Scope.BUSINESS]: [], [Scope.DASHBOARD]: [], [Scope.WORKSPACE]: [], [Scope.TEAM]: [], [Scope.SETTINGS]: [] }} defaultScope={selectedLinkedScope || undefined} defaultLinkedToId={selectedLinkedId || undefined} />}
            {isCreateExperimentModalOpen && <CreateExperimentModal onClose={() => setIsCreateExperimentModalOpen(false)} onCreate={handleCreateExperiment} linkableItems={{ [Scope.PRODUCT]: (startupData.products || []).map(p => ({ id: p.id, name: p.name })), [Scope.FUNDRAISING]: (startupData.funding_rounds || []).map(r => ({ id: r.round_id, name: `${r.round_type} Round` })), [Scope.MARKETING]: (marketingCampaigns || []).map(c => ({ id: c.campaign_id, name: c.campaign_name })), [Scope.GENERAL]: [], [Scope.BUSINESS]: [], [Scope.DASHBOARD]: [], [Scope.WORKSPACE]: [], [Scope.TEAM]: [], [Scope.SETTINGS]: [] }} />}
            {isCreateArtifactModalOpen && <CreateArtifactModal onClose={() => { setIsCreateArtifactModalOpen(false); setSelectedLinkedScope(null); setSelectedLinkedId(null); }} onCreate={handleCreateArtifact} linkableItems={{ [Scope.PRODUCT]: (startupData.products || []).map(p => ({ id: p.id, name: p.name })), [Scope.FUNDRAISING]: (startupData.funding_rounds || []).map(r => ({ id: r.round_id, name: `${r.round_type} Round` })), [Scope.MARKETING]: (marketingCampaigns || []).map(c => ({ id: c.campaign_id, name: c.campaign_name })), [Scope.GENERAL]: [], [Scope.BUSINESS]: [], [Scope.DASHBOARD]: [], [Scope.WORKSPACE]: [], [Scope.TEAM]: [], [Scope.SETTINGS]: [] }} defaultScope={selectedLinkedScope || undefined} defaultLinkedToId={selectedLinkedId || undefined} />}
            {isCreateProductModalOpen && <CreateProductModal onClose={() => setIsCreateProductModalOpen(false)} onCreate={handleCreateProduct} />}
            {isCreateFeatureModalOpen && selectedProductId && <CreateFeatureModal onClose={() => setIsCreateFeatureModalOpen(false)} onCreate={(data) => handleCreateFeature(data, selectedProductId)} />}
            {isCreateMetricModalOpen && <CreateMetricModal onClose={() => setIsCreateMetricModalOpen(false)} onCreate={handleCreateMetric} products={startupData.products} productId={selectedProductId} />}
            {isCreateIssueModalOpen && <CreateIssueModal onClose={() => setIsCreateIssueModalOpen(false)} onCreate={handleCreateIssue} products={startupData.products} productId={selectedProductId} />}
            {isCreateReportModalOpen && <CreateMonthlyReportModal onClose={() => setIsCreateReportModalOpen(false)} onCreate={handleCreateMonthlyReport} />}
            {isCreateFundingRoundModalOpen && <CreateFundingRoundModal onClose={() => setIsCreateFundingRoundModalOpen(false)} onCreate={handleCreateFundingRound} />}
            {isCreateInvestorModalOpen && <CreateInvestorModal onClose={() => setIsCreateInvestorModalOpen(false)} onCreate={handleCreateInvestor} />}
            {isCreateCampaignModalOpen && <CreateCampaignModal onClose={() => setIsCreateCampaignModalOpen(false)} onCreate={handleCreateCampaign} products={startupData.products} />}
            {isCreateContentItemModalOpen && <CreateContentItemModal onClose={() => setIsCreateContentItemModalOpen(false)} onCreate={handleCreateContentItem} campaigns={(marketingCampaigns || []).filter(c => c.content_mode)} defaultCampaignId={selectedCampaignForContent} />}
            {isCreateFounderModalOpen && <CreateFounderModal onClose={() => setIsCreateFounderModalOpen(false)} onCreate={handleCreateFounder} />}
            {isEditBusinessOverviewModalOpen && startupData?.business_overview && <EditBusinessOverviewModal businessOverview={startupData.business_overview} onClose={() => setIsEditBusinessOverviewModalOpen(false)} onUpdate={handleUpdateBusinessOverview} />}
            {isEditFundraisingGoalsModalOpen && startupData?.fundraise_details && <EditFundraisingGoalsModal fundraiseDetails={startupData.fundraise_details} nextFundingGoal={startupData.fundraise_details.next_funding_goal} onClose={() => setIsEditFundraisingGoalsModalOpen(false)} onUpdate={handleUpdateFundraisingGoals} />}
            {isEditCampaignModalOpen && selectedCampaignToEdit && startupData?.products && <EditCampaignModal campaign={selectedCampaignToEdit} onClose={() => setIsEditCampaignModalOpen(false)} onUpdate={(updatedData) => handleUpdateCampaign(selectedCampaignToEdit.campaign_id, updatedData)} products={startupData.products} />}
            {isEditFounderModalOpen && selectedFounderToEdit && <EditFounderModal founder={selectedFounderToEdit} onClose={() => setIsEditFounderModalOpen(false)} onUpdate={(updatedData) => handleUpdateFounder(selectedFounderToEdit.id, updatedData)} />}
            {isEditProductModalOpen && selectedProductToEdit && <EditProductModal product={selectedProductToEdit} onClose={() => setIsEditProductModalOpen(false)} onUpdate={(updatedData) => handleUpdateProduct(selectedProductToEdit.id, updatedData)} />}
            {isEditProductBusinessDetailsModalOpen && selectedProductBusinessDetailsToEdit && productIdForBusinessDetailsEdit && <EditProductBusinessDetailsModal productBusinessDetails={selectedProductBusinessDetailsToEdit} onClose={() => setIsEditProductBusinessDetailsModalOpen(false)} onUpdate={(updatedData) => handleUpdateProductBusinessDetails(productIdForBusinessDetailsEdit, updatedData)} />}
            {isEditFundingRoundModalOpen && selectedFundingRoundToEdit && <EditFundingRoundModal round={selectedFundingRoundToEdit} onClose={() => setIsEditFundingRoundModalOpen(false)} onUpdate={(updatedData) => handleUpdateFundingRound(selectedFundingRoundToEdit.round_id, updatedData)} />}
            {isEditMetricModalOpen && selectedMetricToEdit && productIdForMetricEdit && <EditMetricModal metric={selectedMetricToEdit} onClose={() => setIsEditMetricModalOpen(false)} onUpdate={(updatedData) => handleUpdateMetric(productIdForMetricEdit, selectedMetricToEdit.metric_id, updatedData)} />}
            {isEditFeatureModalOpen && selectedFeatureToEdit && productIdForFeatureEdit && <EditFeatureModal feature={selectedFeatureToEdit} onClose={() => setIsEditFeatureModalOpen(false)} onUpdate={(updatedData) => handleUpdateFeature(productIdForFeatureEdit, selectedFeatureToEdit.id, updatedData)} />}
        </div>
    );
};

export default DashboardPage;