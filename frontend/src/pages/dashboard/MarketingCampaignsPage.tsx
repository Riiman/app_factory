/**
 * @file MarketingCampaignsPage.tsx
 * @description This page displays a list of all marketing campaigns.
 * Each campaign is shown in a clickable card, allowing navigation to its detail page.
 */

import React from 'react';
import { MarketingCampaign, MarketingCampaignStatus } from '@/types/dashboard-types';
import Card from '@/components/Card';
import api from '@/utils/api';
import { Plus, Sparkles } from 'lucide-react';

// ... (existing interfaces)

/**
 * Props for the MarketingCampaignsPage component.
 * @interface MarketingCampaignsPageProps
 */
interface MarketingCampaignsPageProps {
    startupId: number;
    /** An array of all marketing campaign objects. The backend should provide an array of `MarketingCampaign` objects. */
    campaigns: MarketingCampaign[];
    setCampaigns: React.Dispatch<React.SetStateAction<MarketingCampaign[]>>;
    /** Callback function triggered when a campaign card is clicked, passing the campaign's ID. */
    onSelectCampaign: (campaignId: number) => void;
    /** Callback function triggered when the "Create New Campaign" button is clicked. */
    onAddNewCampaign: () => void;
}

const getStatusColor = (status: MarketingCampaignStatus) => {
    switch (status) {
        case MarketingCampaignStatus.ACTIVE: return 'bg-green-100 text-green-800';
        case MarketingCampaignStatus.COMPLETED: return 'bg-blue-100 text-blue-800';
        case MarketingCampaignStatus.PAUSED: return 'bg-yellow-100 text-yellow-800';
        case MarketingCampaignStatus.PLANNED:
        default: return 'bg-gray-100 text-gray-800';
    }
};

const MarketingCampaignsPage: React.FC<MarketingCampaignsPageProps> = ({ startupId, campaigns, onSelectCampaign, onAddNewCampaign }) => {
    const handleGenerateGtm = async () => {
        if (confirm('Are you sure you want to generate a GTM strategy based on your scope document?')) {
            try {
                await api.generateAssets(startupId, false, true);
                alert('GTM strategy generation triggered! This may take a few minutes.');
            } catch (error) {
                console.error("Failed to trigger generation:", error);
                alert("Failed to trigger generation.");
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
                <div className="flex space-x-2">
                    {(campaigns || []).length === 0 && (
                        <button
                            onClick={handleGenerateGtm}
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                        >
                            <Sparkles className="h-5 w-5 mr-2" />
                            <span className="text-sm font-medium">Generate Strategy</span>
                        </button>
                    )}
                    <button
                        onClick={onAddNewCampaign}
                        className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                        <Plus className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Create New Campaign</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(campaigns || []).map(campaign => (
                    <div key={campaign.campaign_id} onClick={() => onSelectCampaign(campaign.campaign_id)} className="cursor-pointer">
                        <Card>
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{campaign.campaign_name}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                                    {campaign.status}
                                </span>
                            </div>
                            <p className="mt-3 text-sm text-gray-600">
                                {campaign.objective}
                            </p>
                            <div className="mt-4 border-t pt-3">
                                <p className="text-xs text-gray-500">Channel: <span className="font-medium text-gray-700">{campaign.channel}</span></p>
                                <p className="text-xs text-gray-500">
                                    Dates: <span className="font-medium text-gray-700">{new Date(campaign.start_date).toLocaleDateString()} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}</span>
                                </p>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketingCampaignsPage;