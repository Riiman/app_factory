/**
 * @file MarketingOverviewPage.tsx
 * @description This page serves as a high-level dashboard for the startup's marketing efforts.
 * It displays aggregated KPIs from all campaigns and the main positioning statement.
 */

import React from 'react';
import { MarketingOverview, MarketingCampaign } from '../types';
import Card from '../components/Card';
import { Edit, Target, DollarSign, Eye, Pointer, Goal } from 'lucide-react';

/**
 * Props for the MarketingOverviewPage component.
 * @interface MarketingOverviewPageProps
 */
interface MarketingOverviewPageProps {
    /** The marketing overview object containing the positioning statement. The backend should provide an object conforming to the `MarketingOverview` interface. */
    marketingOverview: MarketingOverview;
    /** An array of all marketing campaigns to calculate aggregate KPIs. The backend should provide an array of `MarketingCampaign` objects. */
    campaigns: MarketingCampaign[];
}

const KpiCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <Card className="flex-1">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-2">
                <Icon className="h-6 w-6 text-brand-primary" />
            </div>
        </div>
    </Card>
);

const MarketingOverviewPage: React.FC<MarketingOverviewPageProps> = ({ marketingOverview, campaigns }) => {
    const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);
    const totalConversions = campaigns.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0);

    const formatCompactNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
        return num.toLocaleString();
    };

    const formatCurrency = (num: number) => `$${formatCompactNumber(num)}`;


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Marketing Overview</h1>
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Edit Positioning</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Spend" value={formatCurrency(totalSpend)} icon={DollarSign} />
                <KpiCard title="Total Impressions" value={formatCompactNumber(totalImpressions)} icon={Eye} />
                <KpiCard title="Total Clicks" value={formatCompactNumber(totalClicks)} icon={Pointer} />
                <KpiCard title="Total Conversions" value={formatCompactNumber(totalConversions)} icon={Goal} />
            </div>

            <Card>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <Target className="h-10 w-10 text-brand-primary bg-indigo-100 p-2 rounded-lg" />
                    </div>
                    <div className="ml-4">
                        <h2 className="text-lg font-semibold text-gray-800">Positioning Statement</h2>
                        <p className="mt-1 text-gray-600 text-xl italic">
                            "{marketingOverview.positioning_statement}"
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default MarketingOverviewPage;