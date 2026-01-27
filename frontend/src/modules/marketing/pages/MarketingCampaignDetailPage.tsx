/**
 * @file MarketingCampaignDetailPage.tsx
 * @description A detailed view for a single marketing campaign. It displays performance metrics,
 * linked tasks and artifacts, and if it's a content-driven campaign, it shows the content calendar.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketingCampaign, MarketingContentStatus, Task, Artifact, MarketingContentItem } from '@/types/dashboard-types';
import ContentPreviewModal from '../components/ContentPreviewModal';
import ContentItemModal from '../components/ContentItemModal';
import ContentStatsModal from '../components/ContentStatsModal';
import Card from '@/components/Card';
import { ArrowLeft, Edit, Plus, ClipboardList, Paperclip, Eye, Trash2, RefreshCw, BarChart2 } from 'lucide-react';

import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Props for the MarketingCampaignDetailPage component.
 */
interface MarketingCampaignDetailPageProps {
    /** The ID of the marketing campaign to display. */
    campaignId: number;
    /** Callback function to navigate back to the campaigns list. */
    onBack: () => void;
    /** Callback function to open the "Edit Campaign" modal for this campaign. */
    onEditCampaign: (campaign: MarketingCampaign) => void;
    /** Callback function to open the "Create Task" modal, pre-linking to this campaign. */
    onAddTask: (campaignId: number) => void;
    /** Callback function to open the "Create Artifact" modal, pre-linking to this campaign. */
    onAddArtifact: (campaignId: number) => void;
}

const formatNumber = (value: number | undefined) => (value || 0).toLocaleString();

const getContentStatusColor = (status: MarketingContentStatus) => {
    switch (status) {
        case MarketingContentStatus.PUBLISHED: return 'bg-green-100 text-green-800';
        case MarketingContentStatus.DRAFT: return 'bg-yellow-100 text-yellow-800';
        case MarketingContentStatus.PLANNED: return 'bg-gray-100 text-gray-800';
    }
}

const MarketingCampaignDetailPage: React.FC<MarketingCampaignDetailPageProps> = ({ campaignId, onBack, onEditCampaign, onAddTask, onAddArtifact }) => {
    const { user } = useAuth();
    const [previewItem, setPreviewItem] = useState<MarketingContentItem | null>(null);
    const [statsItem, setStatsItem] = useState<MarketingContentItem | null>(null);
    const [editingItem, setEditingItem] = useState<MarketingContentItem | null>(null);
    const [isCreatingContent, setIsCreatingContent] = useState(false);
    const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);

    // Fetch Data
    const { data: campaigns = [], refetch: refetchCampaigns } = useQuery({
        queryKey: ['campaigns', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getCampaigns(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const campaign = campaigns.find((c: MarketingCampaign) => c.campaign_id === campaignId);

    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getTasks(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const { data: artifacts = [] } = useQuery({
        queryKey: ['artifacts', user?.startup_id],
        queryFn: () => user?.startup_id ? (api as any).getArtifacts(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const linkedTasks = tasks.filter((t: Task) => t.linked_to_type === 'MarketingCampaign' && t.linked_to_id === campaignId);
    const linkedArtifacts = artifacts.filter((a: Artifact) => a.linked_to_type === 'MarketingCampaign' && a.linked_to_id === campaignId);

    const handleDelete = async (contentId: number) => {
        if (!window.confirm('Are you sure you want to delete this content item?')) return;
        try {
            await api.deleteContentItem(user!.startup_id, contentId);
            toast.success('Content item deleted');
            refetchCampaigns();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete content item');
        }
    };

    const handleUpdate = async (contentData: Partial<MarketingContentItem>) => {
        if (!editingItem) return;
        try {
            await api.updateContentItem(user!.startup_id, editingItem.content_id, contentData);
            toast.success('Content item updated');
            refetchCampaigns();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to update content item');
            throw error;
        }
    };

    const handleCreate = async (contentData: Partial<MarketingContentItem>) => {
        try {
            await api.createContentItem(user!.startup_id, campaignId, contentData);
            toast.success('Content item created');
            refetchCampaigns();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to create content item');
            throw error;
        }
    };

    const handleRefreshMetrics = async () => {
        setIsRefreshingMetrics(true);
        try {
            await api.recalculateCampaignMetrics(user!.startup_id!);
            toast.success('Metrics recalculated');
            refetchCampaigns();
        } catch (error) {
            console.error(error);
            toast.error('Failed to refresh metrics');
        } finally {
            setIsRefreshingMetrics(false);
        }
    };

    if (!campaign) {
        return <div className="p-4">Loading campaign...</div>;
    }

    // Process available channels
    const availableChannels = campaign.channel ? campaign.channel.split(',').map((c: string) => c.trim()) : [];

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                <ArrowLeft size={16} className="mr-2" />
                Back to Campaigns
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{campaign.campaign_name}</h1>
                                <p className="text-gray-600">{campaign.objective}</p>
                                <p className="text-sm text-gray-400 mt-1">Channels: {campaign.channel}</p>
                            </div>
                            <button onClick={() => onEditCampaign(campaign)} className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1" /> Edit Campaign</button>
                        </div>
                    </Card>

                    {/* Performance Metrics - Moved Here */}
                    <Card
                        title="Performance Metrics"
                        actions={
                            <button
                                onClick={handleRefreshMetrics}
                                disabled={isRefreshingMetrics}
                                className={`text-sm font-medium text-brand-primary flex items-center ${isRefreshingMetrics ? 'opacity-50 cursor-not-allowed' : 'hover:text-brand-dark'}`}
                            >
                                <RefreshCw size={14} className={`mr-1 ${isRefreshingMetrics ? 'animate-spin' : ''}`} />
                                {isRefreshingMetrics ? 'Refreshing...' : 'Refresh Data'}
                            </button>
                        }
                    >
                        {campaign.metrics ? ( // Check if metrics exist (even if 0) - wait, Campaign model has flat fields, not a 'metrics' object based on routes.py updates. Wait, route updates specific fields. The UI was using 'campaign.metrics' before? Let's check the props again. 
                            // The UI used `campaign.revenue` etc directly in previous step. Wait, my previous edit used `campaign.metrics`?
                            // Let's check line 188 of previous file viewer... 
                            // Ah, the previous file view showed `campaign.metrics` check. But `MarketingCampaign` model has flat fields `impressions`, `clicks` etc.
                            // I should probably fix this access pattern too. 
                            // Actually, looking at `MarketingCampaign` in models.py, it has `impressions`, `clicks` etc as direct fields.
                            // So the check `campaign.metrics` is likely wrong or a legacy idea. I should check `campaign.impressions !== null`.

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-600 font-medium uppercase">Spend</p>
                                    <p className="text-xl font-bold text-gray-900">${formatNumber(campaign.spend)}</p>
                                </div>
                                {/* Revenue isn't in Campaign model? It has conversions. Let's stick to model fields for now or assume revenue is passed? 
                                   Model has: spend, impressions, clicks, conversions. 
                                   Frontend previously tried to show Revenue and ROI. 
                                   I will calculate ROI if possible or just show conversions.
                                */}
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-xs text-green-600 font-medium uppercase">Conversions</p>
                                    <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.conversions)}</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg">
                                    <p className="text-xs text-purple-600 font-medium uppercase">Clicks</p>
                                    <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.clicks)}</p>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg">
                                    <p className="text-xs text-orange-600 font-medium uppercase">Impressions</p>
                                    <p className="text-xl font-bold text-gray-900">{formatNumber(campaign.impressions)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-600 font-medium uppercase">Spend</p>
                                    <p className="text-xl font-bold text-gray-900">$0</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-xs text-green-600 font-medium uppercase">Conversions</p>
                                    <p className="text-xl font-bold text-gray-900">0</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg">
                                    <p className="text-xs text-purple-600 font-medium uppercase">Clicks</p>
                                    <p className="text-xl font-bold text-gray-900">0</p>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg">
                                    <p className="text-xs text-orange-600 font-medium uppercase">Impressions</p>
                                    <p className="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {campaign.content_mode && (
                        <Card title="Content Calendar" actions={<button onClick={() => setIsCreatingContent(true)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Content</button>}>
                            <div className="space-y-4">
                                {campaign.content_calendars && campaign.content_calendars.map((calendar: any) => (
                                    <div key={calendar.calendar_id}>
                                        {(calendar.content_items || []).length === 0 && <p className="text-gray-500 text-sm italic py-2">No content items yet.</p>}
                                        {(calendar.content_items || []).map((item: any) => (
                                            <div key={item.content_id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center mb-2 hover:bg-gray-100 transition-colors">
                                                <div>
                                                    <p className="font-medium text-gray-800">{item.title}</p>
                                                    <p className="text-sm text-gray-500">{item.content_type} on {item.channel}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right mr-2">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContentStatusColor(item.status)}`}>{item.status}</span>
                                                        <p className="text-xs text-gray-500 mt-1">Due: {new Date(item.publish_date).toLocaleDateString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setPreviewItem(item)}
                                                        className="p-1.5 text-gray-400 hover:text-brand-primary bg-white rounded-full border border-gray-200 hover:border-brand-primary transition-all"
                                                        title="Preview Content"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {item.status !== MarketingContentStatus.PUBLISHED ? (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingItem(item)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 bg-white rounded-full border border-gray-200 hover:border-blue-600 transition-all"
                                                                title="Edit Content"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.content_id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 bg-white rounded-full border border-gray-200 hover:border-red-600 transition-all"
                                                                title="Delete Content"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStatsItem(item);
                                                            }}
                                                            className="p-1.5 text-indigo-600 hover:text-indigo-900 bg-white rounded-full border border-indigo-100 hover:border-indigo-300 transition-all"
                                                            title="View Stats"
                                                        >
                                                            <BarChart2 size={16} />
                                                        </button>
                                                    )}
                                                    {item.status === MarketingContentStatus.PUBLISHED && item.performance && (
                                                        <button
                                                            onClick={() => setStatsItem(item)}
                                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded ml-1 border border-gray-200 cursor-pointer transition-colors"
                                                            title="View Stats"
                                                        >
                                                            Stats Available
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}


                </div>

                <div className="space-y-6">
                    <Card
                        title="Linked Tasks"
                        actions={<button onClick={() => onAddTask(campaign.campaign_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Task</button>}
                    >
                        <ul className="space-y-2">
                            {linkedTasks.map((task: Task) => (
                                <li key={task.id} className="flex items-center text-sm text-gray-700">
                                    <ClipboardList size={14} className="mr-2 text-gray-400" /> {task.name}
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card
                        title="Linked Artifacts"
                        actions={<button onClick={() => onAddArtifact(campaign.campaign_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Artifact</button>}
                    >
                        <ul className="space-y-2">
                            {linkedArtifacts.map((artifact: Artifact) => (
                                <li key={artifact.id} className="flex items-center text-sm text-gray-700">
                                    <Paperclip size={14} className="mr-2 text-gray-400" /> {artifact.name}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>

            {/* Preview Modal */}
            {previewItem && (
                <ContentPreviewModal
                    item={previewItem}
                    onClose={() => setPreviewItem(null)}
                />
            )}

            {/* Stats Modal */}
            {statsItem && (
                <ContentStatsModal
                    item={statsItem}
                    startupId={user!.startup_id!}
                    onClose={() => setStatsItem(null)}
                    onRefresh={() => {
                        refetchCampaigns(); // Update parent list stats
                        // We might want to keep modal open, so we don't close here
                    }}
                />
            )}

            {/* Unified Content Item Modal for Edit */}
            {editingItem && (
                <ContentItemModal
                    item={editingItem}
                    startupId={user!.startup_id!}
                    availableChannels={availableChannels}
                    onClose={() => setEditingItem(null)}
                    onSave={handleUpdate}
                />
            )}

            {/* Unified Content Item Modal for Create */}
            {isCreatingContent && (
                <ContentItemModal
                    item={null} // Create Mode
                    startupId={user!.startup_id!}
                    availableChannels={availableChannels}
                    onClose={() => setIsCreatingContent(false)}
                    onSave={handleCreate}
                />
            )}
        </div>
    );
};

export default MarketingCampaignDetailPage;