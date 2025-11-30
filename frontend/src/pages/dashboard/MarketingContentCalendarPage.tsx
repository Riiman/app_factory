/**
 * @file MarketingContentCalendarPage.tsx
 * @description This page provides a global, centralized view of the entire content strategy.
 * It aggregates all content items from every content-driven campaign into a single, sortable table.
 */

import React from 'react';
import { MarketingCampaign, MarketingContentItem, MarketingContentStatus } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus, Calendar } from 'lucide-react';

/**
 * Props for the MarketingContentCalendarPage component.
 * @interface MarketingContentCalendarPageProps
 */
interface MarketingContentCalendarPageProps {
    startupId: number;
    /** An array of all marketing campaigns. The page filters for content-driven campaigns. The backend should provide all campaigns that have `content_mode: true`. */
    campaigns: MarketingCampaign[];
    setCampaigns: React.Dispatch<React.SetStateAction<MarketingCampaign[]>>;
    /** Callback function triggered when the "Add Content Item" button is clicked. */
    onAddNewContentItem: () => void;
}

const getContentStatusColor = (status: MarketingContentStatus) => {
    switch(status) {
        case MarketingContentStatus.PUBLISHED: return 'bg-green-100 text-green-800';
        case MarketingContentStatus.DRAFT: return 'bg-yellow-100 text-yellow-800';
        case MarketingContentStatus.PLANNED: return 'bg-gray-100 text-gray-800';
    }
}

interface EnrichedContentItem extends MarketingContentItem {
    campaignName: string;
}

const MarketingContentCalendarPage: React.FC<MarketingContentCalendarPageProps> = ({ campaigns, onAddNewContentItem }) => {
    
    const allContentItems: EnrichedContentItem[] = (campaigns || [])
        .filter(c => c.content_mode && c.content_calendars && c.content_calendars.length > 0)
        .flatMap(campaign => 
            campaign.content_calendars!.flatMap(calendar => 
                calendar.content_items.map(item => ({
                    ...item,
                    campaignName: campaign.campaign_name
                }))
            )
        )
        .sort((a, b) => new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime());

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
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publish Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allContentItems.map((item) => (
                                    <tr key={item.content_id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.campaignName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.content_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.publish_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getContentStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
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
        </div>
    );
};

export default MarketingContentCalendarPage;