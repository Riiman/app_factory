/**
 * @file MarketingContentCalendarPage.tsx
 * @description This page provides a global, centralized view of the entire content strategy.
 * It aggregates all content items from every content-driven campaign into a single, sortable table.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketingCampaign, MarketingContentItem, MarketingContentStatus } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus, Calendar, Image as ImageIcon, Send, RefreshCw, BarChart2, Eye, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import ContentPreviewModal from '../components/ContentPreviewModal';
import EditContentItemModal from '../components/EditContentItemModal';

/**
 * Props for the MarketingContentCalendarPage component.
 * @interface MarketingContentCalendarPageProps
 */
interface MarketingContentCalendarPageProps {
    startupId: number;
    /** Callback function triggered when the "Add Content Item" button is clicked. */
    onAddNewContentItem: () => void;
}

const getContentStatusColor = (status: MarketingContentStatus) => {
    switch (status) {
        case MarketingContentStatus.PUBLISHED: return 'bg-green-100 text-green-800';
        case MarketingContentStatus.DRAFT: return 'bg-yellow-100 text-yellow-800';
        case MarketingContentStatus.PLANNED: return 'bg-gray-100 text-gray-800';
    }
}

interface EnrichedContentItem extends MarketingContentItem {
    campaignName: string;
}

const MarketingContentCalendarPage: React.FC<MarketingContentCalendarPageProps> = ({ startupId, onAddNewContentItem }) => {
    const [previewItem, setPreviewItem] = React.useState<MarketingContentItem | null>(null);
    const [editingItem, setEditingItem] = React.useState<MarketingContentItem | null>(null);

    const { data: campaigns = [], refetch } = useQuery<MarketingCampaign[]>({
        queryKey: ['campaigns', startupId],
        queryFn: () => api.getCampaigns(startupId),
        enabled: !!startupId,
    });

    const allContentItems: EnrichedContentItem[] = (campaigns || [])
        .filter(c => c.content_mode && c.content_calendars && c.content_calendars.length > 0)
        .flatMap(campaign =>
            campaign.content_calendars!.flatMap(calendar =>
                (calendar.content_items || []).map((item: any) => ({
                    ...item,
                    campaignName: campaign.campaign_name
                }))
            )
        )
        .sort((a, b) => new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime());

    const handlePublish = async (contentId: number) => {
        try {
            await api.post(`/startups/${startupId}/content-items/${contentId}/publish`, {});
            toast.success('Content published successfully!');
            refetch();
        } catch (error) {
            toast.error('Failed to publish content');
        }
    };

    const handleRefreshMetrics = async (contentId: number) => {
        try {
            await api.post(`/startups/${startupId}/content-items/${contentId}/refresh-metrics`, {});
            toast.success('Metrics updated!');
            refetch();
        } catch (error) {
            toast.error('Failed to refresh metrics');
        }
    };

    const handleDelete = async (contentId: number) => {
        if (!window.confirm('Are you sure you want to delete this content item?')) return;
        try {
            await api.deleteContentItem(startupId, contentId);
            toast.success('Content item deleted');
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete content item');
        }
    };

    const handleUpdate = async (contentId: number, data: Partial<MarketingContentItem>) => {
        try {
            await api.updateContentItem(startupId, contentId, data);
            toast.success('Content item updated');
            setEditingItem(null);
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update content item');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
                <button
                    onClick={onAddNewContentItem}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add Content Item</span>
                </button>
            </div>
            <Card>
                {allContentItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Title</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publish Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allContentItems.map((item) => (
                                    <tr key={item.content_id}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.image_url ? (
                                                <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="group relative block w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={item.image_url} alt="Generated asset" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-400">text only</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.campaignName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.content_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.publish_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getContentStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => setPreviewItem(item)}
                                                    className="text-gray-400 hover:text-brand-primary p-1 rounded-full hover:bg-gray-100 transition-colors"
                                                    title="Preview"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingItem(item)}
                                                    className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.content_id)}
                                                    className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                {item.status === MarketingContentStatus.PUBLISHED ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleRefreshMetrics(item.content_id)}
                                                            className="text-indigo-600 hover:text-indigo-900 ml-2"
                                                            title="Refresh Metrics"
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </button>
                                                        {item.performance && (
                                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center ml-1" title={JSON.stringify(item.performance)}>
                                                                <BarChart2 className="h-3 w-3 mr-1" />
                                                                Stats
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePublish(item.content_id)}
                                                        className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 text-xs font-medium transition-colors ml-2"
                                                    >
                                                        <Send className="h-3 w-3 mr-1" />
                                                        Post Now
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No content items found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Create a content-driven campaign to start planning your content here.
                        </p>
                    </div>
                )}
            </Card>

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
                    startupId={startupId}
                />
            )}
        </div>
    );
};

export default MarketingContentCalendarPage;