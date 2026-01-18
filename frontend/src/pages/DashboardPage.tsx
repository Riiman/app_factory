
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Scope, Startup, BusinessMonthlyData, FundingRound, Task, Experiment, Artifact, Product, MarketingCampaign, ProductMetric, ProductBusinessDetails, Investor, ActivityLog, DashboardNotification, Feature, Fundraise, NextFundingGoal } from '@/types/dashboard-types';
import api, { getWebSocketUrl } from '@/utils/api';
import Sidebar from '@/modules/dashboard/components/Sidebar';
import Header from '@/modules/dashboard/components/Header';
import DashboardOverview from '@/modules/dashboard/pages/DashboardOverview';
import NotificationCenter from '@/modules/dashboard/components/NotificationCenter';
import TasksPage from '@/modules/dashboard/pages/TasksPage';
import ProductListPage from '@/modules/product/pages/ProductListPage';
import ProductDetailPage from '@/modules/product/pages/ProductDetailPage';
import ProductMetricsPage from '@/modules/product/pages/ProductMetricsPage';
import ProductIssuesPage from '@/modules/product/pages/ProductIssuesPage';
import BusinessOverviewPage from '@/modules/business/pages/BusinessOverviewPage';
import BusinessMonthlyReportingPage from '@/modules/business/pages/BusinessMonthlyReportingPage';
import MonthlyReportDetailModal from '@/modules/business/components/MonthlyReportDetailModal';
import FundraisingOverviewPage from '@/modules/fundraising/pages/FundraisingOverviewPage';
import FundingRoundsPage from '@/modules/fundraising/pages/FundingRoundsPage';
import InvestorCrmPage from '@/modules/fundraising/pages/InvestorCrmPage';
import FundingRoundDetailPage from '@/modules/fundraising/pages/FundingRoundDetailPage';
import MarketingOverviewPage from '@/modules/marketing/pages/MarketingOverviewPage';
import MarketingCampaignsPage from '@/modules/marketing/pages/MarketingCampaignsPage';
import MarketingCampaignDetailPage from '@/modules/marketing/pages/MarketingCampaignDetailPage';
import MarketingContentCalendarPage from '@/modules/marketing/pages/MarketingContentCalendarPage';
import MarketingSettingsPage from '@/modules/marketing/pages/MarketingSettingsPage';
import TaskDetailModal from '@/modules/dashboard/components/TaskDetailModal';
import ExperimentsPage from '@/modules/dashboard/pages/ExperimentsPage';
import ExperimentDetailModal from '@/modules/dashboard/components/ExperimentDetailModal';
import ArtifactsPage from '@/modules/dashboard/pages/ArtifactsPage';
import ArtifactDetailModal from '@/modules/dashboard/components/ArtifactDetailModal';
import TeamPage from '@/modules/team/pages/TeamPage';
import SettingsPage from '@/modules/settings/pages/SettingsPage';
import { Home, Package, Briefcase, DollarSign, Megaphone, BookOpen, Users, Settings } from 'lucide-react';
import CreateModal from '@/modules/dashboard/components/CreateModal';
import CreateTaskModal from '@/modules/dashboard/components/CreateTaskModal';
import CreateExperimentModal from '@/modules/dashboard/components/CreateExperimentModal';
import CreateArtifactModal from '@/modules/dashboard/components/CreateArtifactModal';
import CreateProductModal from '@/modules/product/components/CreateProductModal';
import CreateFeatureModal from '@/modules/product/components/CreateFeatureModal';
import CreateMetricModal from '@/modules/product/components/CreateMetricModal';
import CreateIssueModal from '@/modules/product/components/CreateIssueModal';
import CreateMonthlyReportModal from '@/modules/business/components/CreateMonthlyReportModal';
import CreateFundingRoundModal from '@/modules/fundraising/components/CreateFundingRoundModal';
import CreateInvestorModal from '@/modules/fundraising/components/CreateInvestorModal';
import CreateCampaignModal from '@/modules/marketing/components/CreateCampaignModal';
import CreateContentItemModal from '@/modules/marketing/components/CreateContentItemModal';

import EditBusinessOverviewModal from '@/modules/business/components/EditBusinessOverviewModal';
import EditFundraisingGoalsModal from '@/modules/fundraising/components/EditFundraisingGoalsModal';
import EditCampaignModal from '@/modules/marketing/components/EditCampaignModal';

import EditProductModal from '@/modules/product/components/EditProductModal';
import EditProductBusinessDetailsModal from '@/modules/product/components/EditProductBusinessDetailsModal';
import AddInvestmentModal from '@/modules/fundraising/components/AddInvestmentModal';

import EditFundingRoundModal from '@/modules/fundraising/components/EditFundingRoundModal';
import EditMetricModal from '@/modules/product/components/EditMetricModal';
import EditFeatureModal from '@/modules/product/components/EditFeatureModal';
import UserSettingsPage from '@/modules/settings/pages/UserSettingsPage';

import { useAuth } from '@/contexts/AuthContext';
import { BusinessOverview, StartupStage } from '@/types/dashboard-types';
import AssetGenerationModal from '@/modules/dashboard/components/AssetGenerationModal';
import RequireScope from '@/components/auth/RequireScope';
import AiAssistant from '@/modules/dashboard/components/AiAssistant';

type CreateModalType = 'task' | 'experiment' | 'artifact';

const DashboardPage: React.FC = () => {
    const { user, isLoading: authLoading, handleLogout, token } = useAuth();

    // --- React Query for Data Fetching ---
    const { data: startup, isLoading: isQueryLoading, isError, error } = useQuery<Startup, Error>({
        queryKey: ['startupData', user?.startup_id],
        queryFn: async () => {
            if (!user?.startup_id) throw new Error("Startup ID not found");
            return api.getStartupData(user.startup_id);
        },
        enabled: !!user?.startup_id,
        refetchOnWindowFocus: true,
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.getNotifications(),
        enabled: !!user?.startup_id,
    });

    const isLoading = authLoading || (!!user?.startup_id && isQueryLoading);
    const queryClient = useQueryClient();

    // --- Socket.IO Listener for Real-time Updates ---
    useEffect(() => {
        if (!user?.startup_id || !token) return;

        const wsUrl = getWebSocketUrl('/ws/dashboard-notifications');
        const ws = new WebSocket(`${wsUrl}?token=${token}`);

        ws.onopen = () => { console.log('Connected to dashboard notifications WebSocket'); };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { type, data } = message;

                if (data.startup_id !== user.startup_id && type !== 'analysis_completed') {
                    // Filter out if needed, though usually user specific tokens prevent this.
                }

                switch (type) {
                    case 'assets_generation_completed':
                        toast.success(data.message || "Assets generated successfully!");
                        queryClient.invalidateQueries({ queryKey: ['startupData', user.startup_id] });
                        queryClient.invalidateQueries({ queryKey: ['marketingOverview', user.startup_id] });
                        queryClient.invalidateQueries({ queryKey: ['campaigns', user.startup_id] });
                        break;
                    case 'scope_generation_completed':
                    case 'contract_generation_completed':
                        toast.success(data.message || "Generated successfully!");
                        queryClient.invalidateQueries({ queryKey: ['startupData', user.startup_id] });
                        break;
                    case 'product_generated':
                        toast.success("Product generated successfully!");
                        queryClient.invalidateQueries({ queryKey: ['products', user.startup_id] });
                        break;
                    case 'campaigns_generated':
                        toast.success("Marketing campaigns generated successfully!");
                        queryClient.invalidateQueries({ queryKey: ['campaigns', user.startup_id] });
                        break;
                    default:
                        break;
                }
            } catch (error) { console.error("WS Error", error); }
        };

        return () => { ws.close(); };
    }, [user?.startup_id, token, queryClient]);



    // --- Asset Generation Modal Logic ---
    const [isAssetGenerationModalOpen, setIsAssetGenerationModalOpen] = useState(false);
    const hasCheckedAssetsRef = useRef(false);

    useEffect(() => {
        if (hasCheckedAssetsRef.current) return;

        if (startup && startup.current_stage === StartupStage.ADMITTED) {
            const hasProduct = startup.has_product ?? (startup.products || []).length > 0;
            const hasGtm = startup.has_gtm ?? (startup.marketing_campaigns || []).length > 0;

            if (!hasProduct || !hasGtm) {
                const hideModal = localStorage.getItem(`hide_asset_modal_${startup.id}`);
                if (!hideModal) {
                    setIsAssetGenerationModalOpen(true);
                }
            }
            hasCheckedAssetsRef.current = true;
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

    const [isEditBusinessOverviewModalOpen, setIsEditBusinessOverviewModalOpen] = useState(false);
    const [isEditFundraisingGoalsModalOpen, setIsEditFundraisingGoalsModalOpen] = useState(false);
    const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
    const [selectedCampaignToEdit, setSelectedCampaignToEdit] = useState<MarketingCampaign | null>(null);
    const [selectedLinkedScope, setSelectedLinkedScope] = useState<Scope | null>(null);
    const [selectedLinkedId, setSelectedLinkedId] = useState<number | null>(null);


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
    const [isAddInvestmentModalOpen, setIsAddInvestmentModalOpen] = useState(false);
    const [selectedRoundIdForInvestment, setSelectedRoundIdForInvestment] = useState<number | null>(null);

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
    // --- Create/Update/Delete Handlers (Refactored to Invalidate Queries) ---
    const handleCreateTask = async (newTaskData: Omit<Task, 'id' | 'startup_id' | 'created_at'>) => {
        if (!startup) return;
        try {
            await api.createTask(startup.id, newTaskData);
            queryClient.invalidateQueries({ queryKey: ['tasks', startup.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboardOverview', startup.id] });
            setIsCreateTaskModalOpen(false);
        } catch (error) { console.error("Failed to create task:", error); }
    };
    const handleCreateExperiment = async (newExperimentData: Omit<Experiment, 'id' | 'startup_id' | 'created_at' | 'status'>) => {
        if (!startup) return;
        try {
            await api.createExperiment(startup.id, newExperimentData);
            queryClient.invalidateQueries({ queryKey: ['experiments', startup.id] });
            setIsCreateExperimentModalOpen(false);
        } catch (error) { console.error("Failed to create experiment:", error); }
    };
    const handleCreateArtifact = async (newArtifactData: Omit<Artifact, 'id' | 'startup_id' | 'created_at'>) => {
        if (!startup) return;
        try {
            await api.createArtifact(startup.id, newArtifactData);
            queryClient.invalidateQueries({ queryKey: ['artifacts', startup.id] });
            setIsCreateArtifactModalOpen(false);
        } catch (error) { console.error("Failed to create artifact:", error); }
    };
    const handleCreateProduct = async (newProductData: Omit<Product, 'id' | 'startup_id' | 'tech_stack' | 'features' | 'metrics' | 'issues' | 'business_details'>) => {
        if (!startup) return;
        try {
            await api.createProduct(startup.id, newProductData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsCreateProductModalOpen(false);
        } catch (error) { console.error("Failed to create product:", error); }
    };
    // Note: Some handlers like createFeature need to invalidate 'products' as specific product data changed
    const handleCreateFeature = async (newFeatureData: Omit<any, 'id' | 'product_id'>, productId: number) => {
        if (!startup) return;
        try {
            await api.createFeature(startup.id, productId, newFeatureData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] }); // Or more specific if DetailPage has specific key
            setIsCreateFeatureModalOpen(false);
        } catch (error) { console.error("Failed to create feature:", error); }
    };
    const handleCreateMetric = async (newMetricData: Omit<ProductMetric, 'metric_id' | 'product_id'>, productId: number) => {
        if (!startup) return;
        try {
            await api.createMetric(startup.id, productId, newMetricData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsCreateMetricModalOpen(false);
        } catch (error) { console.error("Failed to create metric:", error); }
    };
    const handleCreateIssue = async (newIssueData: Omit<any, 'issue_id' | 'product_id' | 'created_by' | 'created_at'>, productId: number) => {
        if (!startup) return;
        try {
            await api.createIssue(startup.id, productId, newIssueData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsCreateIssueModalOpen(false);
        } catch (error) { console.error("Failed to create issue:", error); }
    };
    const handleCreateMonthlyReport = async (newReportData: Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>) => {
        if (!startup) return;
        try {
            await api.createMonthlyReport(startup.id, newReportData);
            queryClient.invalidateQueries({ queryKey: ['businessMonthlyReports', startup.id] });
            queryClient.invalidateQueries({ queryKey: ['businessOverview', startup.id] }); // Metrics might update
            setIsCreateReportModalOpen(false);
        } catch (error) { console.error("Failed to create monthly report:", error); }
    };
    const handleCreateFundingRound = async (newRoundData: Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'investors'>) => {
        if (!startup) return;
        try {
            await api.createFundingRound(startup.id, newRoundData);
            queryClient.invalidateQueries({ queryKey: ['fundingRounds', startup.id] });
            setIsCreateFundingRoundModalOpen(false);
        } catch (error) { console.error("Failed to create funding round:", error); }
    };
    const handleCreateInvestor = async (newInvestorData: Omit<Investor, 'investor_id' | 'created_at'>) => {
        if (!startup) return;
        try {
            await api.createInvestor(startup.id, newInvestorData);
            queryClient.invalidateQueries({ queryKey: ['investors', startup.id] });
            setIsCreateInvestorModalOpen(false);
        } catch (error) { console.error("Failed to create investor:", error); }
    };
    const handleCreateCampaign = async (newCampaignData: Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar' | 'spend'>) => {
        if (!startup) return;
        try {
            await api.createCampaign(startup.id, newCampaignData);
            queryClient.invalidateQueries({ queryKey: ['campaigns', startup.id] });
            setIsCreateCampaignModalOpen(false);
        } catch (error) { console.error("Failed to create campaign:", error); }
    };
    const handleCreateContentItem = async (newContentData: Omit<any, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>, campaignId: number) => {
        if (!startup) return;
        try {
            await api.createContentItem(startup.id, campaignId, newContentData);
            queryClient.invalidateQueries({ queryKey: ['campaigns', startup.id] });
            setIsCreateContentItemModalOpen(false);
        } catch (error) { console.error("Failed to create content item:", error); }
    };
    const handleUpdateStartupSettings = async (updatedSettings: { name: string; slug: string; next_milestone: string }) => {
        if (!startup) return;
        try {
            await api.updateStartupSettings(startup.id, updatedSettings);
            queryClient.invalidateQueries({ queryKey: ['startupData', startup.id] });
        } catch (error) { console.error("Failed to update startup settings:", error); }
    };

    const handleUpdateBusinessOverview = async (updatedData: Partial<BusinessOverview>) => {
        if (!startup) return;
        try {
            await api.updateBusinessOverview(startup.id, updatedData);
            queryClient.invalidateQueries({ queryKey: ['businessOverview', startup.id] });
            setIsEditBusinessOverviewModalOpen(false);
        } catch (error) { console.error("Failed to update business overview:", error); }
    };

    const handleUpdateFundraisingGoals = async (updatedData: Partial<Fundraise>) => {
        if (!startup) return;
        try {
            await api.updateFundraisingGoals(startup.id, updatedData, {});
            queryClient.invalidateQueries({ queryKey: ['fundraiseDetails', startup.id] });
            setIsEditFundraisingGoalsModalOpen(false);
        } catch (error) { console.error("Failed to update fundraising goals:", error); }
    };
    // Update handlers for modals that are still in DashboardPage
    const handleUpdateCampaign = async (campaignId: number, updatedData: Partial<MarketingCampaign>) => {
        if (!startup) return;
        try {
            await api.updateCampaign(startup.id, campaignId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['campaigns', startup.id] });
            setIsEditCampaignModalOpen(false);
        } catch (error) { console.error("Failed to update campaign:", error); }
    };
    const handleUpdateProduct = async (productId: number, updatedData: Partial<Product>) => {
        if (!startup) return;
        try {
            await api.updateProduct(startup.id, productId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsEditProductModalOpen(false);
        } catch (error) { console.error("Failed to update product:", error); }
    };
    const handleUpdateProductBusinessDetails = async (productId: number, updatedData: Partial<ProductBusinessDetails>) => {
        if (!startup) return;
        try {
            await api.updateProductBusinessDetails(startup.id, productId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsEditProductBusinessDetailsModalOpen(false);
        } catch (error) { console.error("Failed to update product business details:", error); }
    };
    const handleUpdateFundingRound = async (roundId: number, updatedData: Partial<FundingRound>) => {
        if (!startup) return;
        try {
            await api.updateFundingRound(startup.id, roundId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['fundingRounds', startup.id] });
            setIsEditFundingRoundModalOpen(false);
        } catch (error) { console.error("Failed to update funding round:", error); }
    };
    const handleUpdateMetric = async (productId: number, metricId: number, updatedData: Partial<ProductMetric>) => {
        if (!startup) return;
        try {
            await api.updateMetric(startup.id, productId, metricId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsEditMetricModalOpen(false);
        } catch (error) { console.error("Failed to update metric:", error); }
    };
    const handleUpdateFeature = async (productId: number, featureId: number, updatedData: Partial<Feature>) => {
        if (!startup) return;
        try {
            await api.updateFeature(startup.id, productId, featureId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['products', startup.id] });
            setIsEditFeatureModalOpen(false);
        } catch (error) { console.error("Failed to update feature:", error); }
    };

    const handleCreateInvestment = async (investorId: number, amount: number) => {
        if (!startup || selectedRoundIdForInvestment === null) return;
        try {
            await api.createInvestment(startup.id, selectedRoundIdForInvestment, investorId, amount);
            queryClient.invalidateQueries({ queryKey: ['fundingRounds', startup.id] });
            setIsAddInvestmentModalOpen(false);
        } catch (error) { console.error("Failed to create investment:", error); }
    };

    const openAddInvestmentModal = (roundId: number) => {
        setSelectedRoundIdForInvestment(roundId);
        setIsAddInvestmentModalOpen(true);
    };


    const handleBackToList = () => setSelectedProductId(null);
    const handleBackToRoundsList = () => setSelectedFundingRoundId(null);
    const handleBackToCampaignsList = () => setSelectedCampaignId(null);

    const getLinkedEntityName = (type?: string, id?: number): string | null => {
        if (!type || !id) return null;
        return `${type} #${id}`; // Placeholder until backend update
    };

    const handlePositioningStatementUpdate = (newStatement: string) => {
        queryClient.invalidateQueries({ queryKey: ['marketingOverview', startup?.id] });
    };

    const handleMarkNotificationAsRead = async (id: number) => {
        try {
            await api.markNotificationAsRead(id);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (error) { console.error("Failed to mark notification as read:", error); }
    };

    const startupData = startup; // Alias for compatibility if needed, but we prefer using 'startup'

    // --- Render Logic ---
    const renderContent = () => {
        if (!startup) return null;

        switch (activeScope) {
            case Scope.DASHBOARD:
                return <DashboardOverview startupId={startup.id} />;

            case Scope.PRODUCT:
                if (activeSubPage === 'Products List') {
                    if (selectedProductId) {
                        return <ProductDetailPage
                            productId={selectedProductId}
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
                    return <ProductListPage startupId={startup.id} onSelectProduct={handleSelectProduct} onAddNewProduct={() => setIsCreateProductModalOpen(true)} isGeneratingProduct={startup.is_generating_product} />;
                }
                if (activeSubPage === 'Product Metrics') {
                    return <ProductMetricsPage startupId={startup.id} onAddNewMetric={() => setIsCreateMetricModalOpen(true)} />;
                }
                if (activeSubPage === 'Issues & Feedback') {
                    return <ProductIssuesPage startupId={startup.id} onAddNewIssue={() => setIsCreateIssueModalOpen(true)} />;
                }
                return <ProductListPage startupId={startup.id} onSelectProduct={handleSelectProduct} onAddNewProduct={() => setIsCreateProductModalOpen(true)} isGeneratingProduct={startup.is_generating_product} />;

            case Scope.BUSINESS:
                if (activeSubPage === 'Overview & Model') {
                    return <BusinessOverviewPage startupId={startup.id} />;
                }
                if (activeSubPage === 'Monthly Reporting') {
                    return <BusinessMonthlyReportingPage
                        startupId={startup.id}
                        onRowClick={handleOpenReportModal}
                        onAddNewReport={() => setIsCreateReportModalOpen(true)}
                    />;
                }
                return <BusinessOverviewPage startupId={startup.id} />;

            case Scope.FUNDRAISING:
                if (activeSubPage === 'Overview') {
                    return <FundraisingOverviewPage startupId={startup.id} />;
                }
                if (activeSubPage === 'Funding Rounds') {
                    if (selectedFundingRoundId) {
                        return (
                            <>
                                <FundingRoundDetailPage
                                    roundId={selectedFundingRoundId}
                                    onBack={handleBackToRoundsList}
                                    onEditRound={(round) => { setSelectedFundingRoundToEdit(round); setIsEditFundingRoundModalOpen(true); }}
                                    onAddInvestor={() => setIsAddInvestmentModalOpen(true)}
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
                                <AddInvestmentModal
                                    isOpen={isAddInvestmentModalOpen}
                                    onClose={() => setIsAddInvestmentModalOpen(false)}
                                    onAdd={handleCreateInvestment}
                                    startupId={startup.id}
                                />
                            </>
                        );
                    }
                    return <FundingRoundsPage
                        startupId={startup.id}
                        onSelectRound={handleSelectFundingRound}
                        onAddNewRound={() => setIsCreateFundingRoundModalOpen(true)}
                    />;
                }
                if (activeSubPage === 'Investor CRM') {
                    return <InvestorCrmPage startupId={startup.id} onAddNewInvestor={() => setIsCreateInvestorModalOpen(true)} />;
                }
                return <FundraisingOverviewPage startupId={startup.id} />;

            case Scope.MARKETING:
                if (activeSubPage === 'Overview') {
                    return <MarketingOverviewPage startupId={startup.id} onPositioningStatementUpdate={handlePositioningStatementUpdate} isGeneratingGtm={startup.is_generating_gtm} />;
                }
                if (activeSubPage === 'Campaigns') {
                    if (selectedCampaignId) {
                        return <MarketingCampaignDetailPage
                            campaignId={selectedCampaignId}
                            onBack={handleBackToCampaignsList}
                            onAddContentItem={() => handleOpenCreateContentItemModal(selectedCampaignId)}
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
                        />;
                    }
                    return <MarketingCampaignsPage startupId={startup.id} onSelectCampaign={handleSelectCampaign} onAddNewCampaign={() => setIsCreateCampaignModalOpen(true)} isGeneratingGtm={startup.is_generating_gtm} />;
                }
                if (activeSubPage === 'Content Calendar') {
                    return <MarketingContentCalendarPage
                        startupId={startup.id}
                        onAddNewContentItem={() => handleOpenCreateContentItemModal()}
                    />;
                }
                if (activeSubPage === 'Content Calendar') {
                    return <MarketingContentCalendarPage
                        startupId={startup.id}
                        onAddNewContentItem={() => handleOpenCreateContentItemModal()}
                    />;
                }
                if (activeSubPage === 'Settings') {
                    return <MarketingSettingsPage startupId={startup.id} />;
                }
                return <MarketingOverviewPage startupId={startup.id} onPositioningStatementUpdate={handlePositioningStatementUpdate} isGeneratingGtm={startup.is_generating_gtm} />;

            case Scope.WORKSPACE:
                return (
                    <RequireScope scope="WORKSPACE" showError>
                        {activeSubPage === 'Tasks' && <TasksPage startupId={startup.id} onTaskClick={handleOpenTaskModal} onAddNewTask={() => setIsCreateTaskModalOpen(true)} />}
                        {activeSubPage === 'Experiments' && <ExperimentsPage startupId={startup.id} onExperimentClick={handleOpenExperimentModal} onAddNewExperiment={() => setIsCreateExperimentModalOpen(true)} />}
                        {activeSubPage === 'Artifacts' && <ArtifactsPage startupId={startup.id} onArtifactClick={handleOpenArtifactModal} getLinkedEntityName={getLinkedEntityName} onAddNewArtifact={() => setIsCreateArtifactModalOpen(true)} />}
                    </RequireScope>
                );

            case Scope.TEAM:
                return (
                    <RequireScope scope="TEAM" showError>
                        <TeamPage startupId={startup.id} />
                    </RequireScope>
                );
            case Scope.SETTINGS:
                return (
                    <RequireScope scope="SETTINGS" showError>
                        <SettingsPage
                            startupName={startup.name}
                            startupSlug={startup.slug}
                            nextMilestone={startup.next_milestone}
                            onSave={handleUpdateStartupSettings}
                        />
                    </RequireScope>
                );
            case Scope.USER_SETTINGS:
                return <UserSettingsPage />;
            default:
                return <DashboardOverview startupId={startup.id} />;
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

    const menuItems = React.useMemo(() => {
        const allItems = [
            { name: 'Dashboard', icon: Home, subItems: [], requiredScope: null },
            { name: 'Product', icon: Package, subItems: ['Products List', 'Product Metrics', 'Issues & Feedback'], requiredScope: 'PRODUCT' },
            { name: 'Business', icon: Briefcase, subItems: ['Overview & Model', 'Monthly Reporting'], requiredScope: 'BUSINESS' },
            { name: 'Fundraising', icon: DollarSign, subItems: ['Overview', 'Funding Rounds', 'Investor CRM'], requiredScope: 'FUNDRAISE' },
            { name: 'Marketing', icon: Megaphone, subItems: ['Overview', 'Campaigns', 'Content Calendar', 'Settings'], requiredScope: 'MARKETING' },
            { name: 'Workspace', icon: BookOpen, subItems: ['Tasks', 'Experiments', 'Artifacts'], requiredScope: 'WORKSPACE' },
            { name: 'Team', icon: Users, subItems: [], requiredScope: 'TEAM' },
            { name: 'Settings', icon: Settings, subItems: [], requiredScope: 'SETTINGS' }
        ];

        if (!user) return [];

        const isOwner = startup && user.id === startup.user_id;
        const isAdmin = user.role === 'admin';

        if (isOwner || isAdmin) {
            return allItems;
        }

        const userScopes = (user.scopes || []).map(s => s.toUpperCase());

        return allItems.filter(item => {
            if (!item.requiredScope) return true;
            return userScopes.includes(item.requiredScope);
        });

    }, [user, startup]);

    if (isLoading || isQueryLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (isError) {
        return <div className="flex items-center justify-center h-screen">Error: {error?.message}</div>;
    }

    if (!startup) {
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
                    startupName={startup.name}
                    currentStage={startup.current_stage}
                    user={user}
                    onCreateClick={handleOpenCreateModal}
                    onSettingsClick={() => handleNavClick(Scope.USER_SETTINGS)}
                    onLogout={handleLogout}
                    notificationCenter={<NotificationCenter notifications={notifications} onMarkAsRead={handleMarkNotificationAsRead} />}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>

            {/* Modals */}
            {isReportModalOpen && selectedReport && <MonthlyReportDetailModal report={selectedReport} onClose={handleCloseReportModal} />}
            {isTaskModalOpen && selectedTask && <TaskDetailModal task={selectedTask} linkedEntityName={getLinkedEntityName(selectedTask.linked_to_type, selectedTask.linked_to_id)} onClose={handleCloseTaskModal} />}
            {isExperimentModalOpen && selectedExperiment && <ExperimentDetailModal experiment={selectedExperiment} linkedEntityName={getLinkedEntityName(selectedExperiment.linked_to_type, selectedExperiment.linked_to_id)} onClose={handleCloseExperimentModal} />}
            {isArtifactModalOpen && selectedArtifact && <ArtifactDetailModal artifact={selectedArtifact} linkedEntityName={getLinkedEntityName(selectedArtifact.linked_to_type, selectedArtifact.linked_to_id)} onClose={handleCloseArtifactModal} />}

            {isCreateModalOpen && <CreateModal onClose={handleCloseCreateModal} onSelectCreateType={handleSelectCreateType} />}

            {isCreateTaskModalOpen && <CreateTaskModal
                onClose={() => { setIsCreateTaskModalOpen(false); setSelectedLinkedScope(null); setSelectedLinkedId(null); }}
                onCreate={handleCreateTask}
                linkableItems={{
                    [Scope.PRODUCT]: (startup.products || []).map((p: any) => ({ id: p.id, name: p.name })),
                    [Scope.FUNDRAISING]: (startup.funding_rounds || []).map((r: any) => ({ id: r.round_id, name: `${r.round_type} Round` })),
                    [Scope.MARKETING]: (startup.marketing_campaigns || []).map((c: any) => ({ id: c.campaign_id, name: c.campaign_name })),
                    [Scope.GENERAL]: [], [Scope.BUSINESS]: [], [Scope.DASHBOARD]: [], [Scope.WORKSPACE]: [], [Scope.TEAM]: [], [Scope.SETTINGS]: [], [Scope.USER_SETTINGS]: []
                }}
                defaultScope={selectedLinkedScope || undefined}
                defaultLinkedToId={selectedLinkedId || undefined}
            />}

            {isCreateExperimentModalOpen && <CreateExperimentModal
                onClose={() => setIsCreateExperimentModalOpen(false)}
                onCreate={handleCreateExperiment}
                linkableItems={{
                    [Scope.PRODUCT]: (startup.products || []).map((p: any) => ({ id: p.id, name: p.name })),
                    [Scope.FUNDRAISING]: (startup.funding_rounds || []).map((r: any) => ({ id: r.round_id, name: `${r.round_type} Round` })),
                    [Scope.MARKETING]: (startup.marketing_campaigns || []).map((c: any) => ({ id: c.campaign_id, name: c.campaign_name })),
                    [Scope.GENERAL]: [], [Scope.BUSINESS]: [], [Scope.DASHBOARD]: [], [Scope.WORKSPACE]: [], [Scope.TEAM]: [], [Scope.SETTINGS]: [], [Scope.USER_SETTINGS]: []
                }}
            />}

            {isCreateArtifactModalOpen && <CreateArtifactModal
                onClose={() => { setIsCreateArtifactModalOpen(false); setSelectedLinkedScope(null); setSelectedLinkedId(null); }}
                onCreate={handleCreateArtifact}
                linkableItems={{
                    [Scope.PRODUCT]: (startup.products || []).map((p: any) => ({ id: p.id, name: p.name })),
                    [Scope.FUNDRAISING]: (startup.funding_rounds || []).map((r: any) => ({ id: r.round_id, name: `${r.round_type} Round` })),
                    [Scope.MARKETING]: (startup.marketing_campaigns || []).map((c: any) => ({ id: c.campaign_id, name: c.campaign_name })),
                    [Scope.GENERAL]: [], [Scope.BUSINESS]: [], [Scope.DASHBOARD]: [], [Scope.WORKSPACE]: [], [Scope.TEAM]: [], [Scope.SETTINGS]: [], [Scope.USER_SETTINGS]: []
                }}
                defaultScope={selectedLinkedScope || undefined}
                defaultLinkedToId={selectedLinkedId || undefined}
            />}

            {isCreateProductModalOpen && <CreateProductModal onClose={() => setIsCreateProductModalOpen(false)} onCreate={handleCreateProduct} />}
            {isCreateFeatureModalOpen && selectedProductId && <CreateFeatureModal onClose={() => setIsCreateFeatureModalOpen(false)} onCreate={(data) => handleCreateFeature(data, selectedProductId)} />}
            {isCreateMetricModalOpen && <CreateMetricModal onClose={() => setIsCreateMetricModalOpen(false)} onCreate={handleCreateMetric} products={startup.products || []} productId={selectedProductId} />}
            {isCreateIssueModalOpen && <CreateIssueModal onClose={() => setIsCreateIssueModalOpen(false)} onCreate={handleCreateIssue} products={startup.products || []} productId={selectedProductId} />}
            {isCreateReportModalOpen && <CreateMonthlyReportModal onClose={() => setIsCreateReportModalOpen(false)} onCreate={handleCreateMonthlyReport} />}
            {isCreateFundingRoundModalOpen && <CreateFundingRoundModal onClose={() => setIsCreateFundingRoundModalOpen(false)} onCreate={handleCreateFundingRound} investors={[]} />}
            {isCreateInvestorModalOpen && <CreateInvestorModal onClose={() => setIsCreateInvestorModalOpen(false)} onCreate={handleCreateInvestor} />}
            {isCreateCampaignModalOpen && <CreateCampaignModal onClose={() => setIsCreateCampaignModalOpen(false)} onCreate={handleCreateCampaign} products={startup.products || []} />}
            {isCreateContentItemModalOpen && <CreateContentItemModal onClose={() => setIsCreateContentItemModalOpen(false)} onCreate={handleCreateContentItem} campaigns={(startup.marketing_campaigns || []).filter((c: any) => c.content_mode)} defaultCampaignId={selectedCampaignForContent} />}


            {isEditBusinessOverviewModalOpen && <EditBusinessOverviewModal businessOverview={startup.business_overview || {} as BusinessOverview} onClose={() => setIsEditBusinessOverviewModalOpen(false)} onUpdate={handleUpdateBusinessOverview} />}
            {isEditFundraisingGoalsModalOpen && <EditFundraisingGoalsModal fundraiseDetails={startup.fundraise_details || {} as Fundraise} nextFundingGoal={startup.fundraise_details?.next_funding_goal || {} as NextFundingGoal} onClose={() => setIsEditFundraisingGoalsModalOpen(false)} onUpdate={handleUpdateFundraisingGoals} />}

            {isEditCampaignModalOpen && selectedCampaignToEdit && <EditCampaignModal campaign={selectedCampaignToEdit} onClose={() => setIsEditCampaignModalOpen(false)} onUpdate={(updatedData) => handleUpdateCampaign(selectedCampaignToEdit.campaign_id, updatedData)} products={startup.products || []} />}

            {isEditProductModalOpen && selectedProductToEdit && <EditProductModal product={selectedProductToEdit} onClose={() => setIsEditProductModalOpen(false)} onUpdate={(updatedData) => handleUpdateProduct(selectedProductToEdit.id, updatedData)} />}
            {isEditProductBusinessDetailsModalOpen && selectedProductBusinessDetailsToEdit && productIdForBusinessDetailsEdit && <EditProductBusinessDetailsModal productBusinessDetails={selectedProductBusinessDetailsToEdit} onClose={() => setIsEditProductBusinessDetailsModalOpen(false)} onUpdate={(updatedData) => handleUpdateProductBusinessDetails(productIdForBusinessDetailsEdit, updatedData)} />}
            {isEditFundingRoundModalOpen && selectedFundingRoundToEdit && <EditFundingRoundModal round={selectedFundingRoundToEdit} onClose={() => setIsEditFundingRoundModalOpen(false)} onUpdate={(updatedData) => handleUpdateFundingRound(selectedFundingRoundToEdit.round_id, updatedData)} investors={[]} />}
            {isEditMetricModalOpen && selectedMetricToEdit && productIdForMetricEdit && <EditMetricModal metric={selectedMetricToEdit} onClose={() => setIsEditMetricModalOpen(false)} onUpdate={(updatedData) => handleUpdateMetric(productIdForMetricEdit, selectedMetricToEdit.metric_id, updatedData)} />}
            {isEditFeatureModalOpen && selectedFeatureToEdit && productIdForFeatureEdit && <EditFeatureModal feature={selectedFeatureToEdit} onClose={() => setIsEditFeatureModalOpen(false)} onUpdate={(updatedData) => handleUpdateFeature(productIdForFeatureEdit, selectedFeatureToEdit.id, updatedData)} />}

            {startup && (
                <>
                    <AiAssistant startupId={startup.id} />
                    <AssetGenerationModal
                        isOpen={isAssetGenerationModalOpen}
                        onClose={() => setIsAssetGenerationModalOpen(false)}
                        startupId={startup.id}
                        hasProduct={startup.has_product ?? (startup.products || []).length > 0}
                        hasGtm={startup.has_gtm ?? (startup.marketing_campaigns || []).length > 0}
                    />
                </>
            )}
        </div>
    );
};

export default DashboardPage;
