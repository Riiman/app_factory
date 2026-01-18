/**
 * @file MarketingCampaignDetailPage.tsx
 * @description A detailed view for a single marketing campaign. It displays performance metrics,
 * linked tasks and artifacts, and if it's a content-driven campaign, it shows the content calendar.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketingCampaign, MarketingContentStatus, Task, Artifact, MarketingContentItem } from '@/types/dashboard-types';
import ContentPreviewModal from '../components/ContentPreviewModal';
import EditContentItemModal from '../components/EditContentItemModal';
import Card from '@/components/Card';
import { ArrowLeft, Edit, Plus, ClipboardList, Paperclip, Eye, Trash2 } from 'lucide-react';

import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Props for the MarketingCampaignDetailPage component.
 * @interface MarketingCampaignDetailPageProps
 */
interface MarketingCampaignDetailPageProps {
    /** The ID of the marketing campaign to display. */
    campaignId: number;
    /** Callback function to navigate back to the campaigns list. */
    onBack: () => void;
    /** Callback function to open the "Create Content Item" modal for this campaign. */
    onAddContentItem: () => void;
    /** Callback function to open the "Edit Campaign" modal for this campaign. */
    onEditCampaign: (campaign: MarketingCampaign) => void;
    /** Callback function to open the "Create Task" modal, pre-linking to this campaign. */
    onAddTask: (campaignId: number) => void;
    /** Callback function to open the "Create Artifact" modal, pre-linking to this campaign. */
    onAddArtifact: (campaignId: number) => void;
}

const formatNumber = (value: number | undefined) => (value || 0).toLocaleString();

const DetailItem: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-md font-semibold text-gray-800">{value || 'N/A'}</p>
    </div>
);

const getContentStatusColor = (status: MarketingContentStatus) => {
    switch (status) {
        case MarketingContentStatus.PUBLISHED: return 'bg-green-100 text-green-800';
        case MarketingContentStatus.DRAFT: return 'bg-yellow-100 text-yellow-800';
        case MarketingContentStatus.PLANNED: return 'bg-gray-100 text-gray-800';
    }
}

const MarketingCampaignDetailPage: React.FC<MarketingCampaignDetailPageProps> = ({ campaignId, onBack, onAddContentItem, onEditCampaign, onAddTask, onAddArtifact }) => {
    const { user } = useAuth();
    const [previewItem, setPreviewItem] = React.useState<MarketingContentItem | null>(null);
    const [editingItem, setEditingItem] = React.useState<MarketingContentItem | null>(null);

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
        // Assuming api.getArtifacts exists (casted to any if strictly typed API doesn't show it yet, but should be there)
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

    const handleUpdate = async (contentId: number, data: Partial<MarketingContentItem>) => {
        try {
            await api.updateContentItem(user!.startup_id, contentId, data);
            toast.success('Content item updated');
            setEditingItem(null);
            refetchCampaigns();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update content item');
        }
    };

    if (!campaign) {
        return <div className="p-4">Loading campaign...</div>;
    }

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                <ArrowLeft size={16} className="mr-2" />
                Back to Campaigns
            </button>

            <Card>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{campaign.campaign_name}</h1>
                        <p className="text-gray-600">{campaign.objective}</p>
                    </div>
                    <button onClick={() => onEditCampaign(campaign)} className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1" /> Edit Campaign</button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {campaign.content_mode && campaign.content_calendars && campaign.content_calendars.length > 0 && (
                        <Card title="Content Calendar" actions={<button onClick={onAddContentItem} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Content</button>}>
                            <div className="space-y-4">
                                {campaign.content_calendars.map((calendar: any) => (
                                    <div key={calendar.calendar_id}>
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
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                    {!campaign.content_mode && <Card title="Performance Metrics">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-sm text-gray-500">Spend</p>
                                <p className="text-2xl font-bold text-gray-900">${formatNumber(campaign.spend)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Impressions</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.impressions)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Clicks</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.clicks)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Conversions</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.conversions)}</p>
                            </div>
                        </div>
                    </Card>}
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

            {/* Edit Modal */}
            {editingItem && (
                <EditContentItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onUpdate={handleUpdate}
                    startupId={user!.startup_id!}
                />
            )}
        </div>
    );
};

export default MarketingCampaignDetailPage;