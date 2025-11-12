/**
 * @file MarketingOverviewPage.tsx
 * @description This page serves as a high-level dashboard for the startup's marketing efforts.
 * It displays aggregated KPIs from all campaigns and the main positioning statement.
 */

import React, { useState } from 'react';
import { MarketingOverview, MarketingCampaign } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Edit, Target, DollarSign, Eye, Pointer, Goal } from 'lucide-react';
import EditPositioningModal from '@/components/dashboard/EditPositioningModal';

/**
 * Props for the MarketingOverviewPage component.
 * @interface MarketingOverviewPageProps
 */
interface MarketingOverviewPageProps {
    /** The marketing overview object containing the positioning statement. */
    marketingOverview: MarketingOverview;
    /** An array of all marketing campaigns to calculate aggregate KPIs. */
    campaigns: MarketingCampaign[];
    /** The ID of the current startup. */
    startupId: number;
    /** Callback function to update the positioning statement in the parent component. */
    onPositioningStatementUpdate: (newStatement: string) => void;
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

const MarketingOverviewPage: React.FC<MarketingOverviewPageProps> = ({ marketingOverview, campaigns, startupId, onPositioningStatementUpdate }) => {
    const { positioning_statement } = marketingOverview || {};
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentPositioning, setCurrentPositioning] = useState(positioning_statement);

    const totalSpend = (campaigns || []).reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
    const totalImpressions = (campaigns || []).reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
    const totalClicks = (campaigns || []).reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);
    const totalConversions = (campaigns || []).reduce((sum, campaign) => sum + (campaign.conversions || 0), 0);

    const formatCompactNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
        return num.toLocaleString();
    };

    const formatCurrency = (num: number) => `$${formatCompactNumber(num)}`;

    const handleSavePositioning = async (newStatement: string) => {
        try {
            const response = await fetch(`/api/startups/${startupId}/marketing-overview`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ positioning_statement: newStatement }),
            });

            if (!response.ok) {
                throw new Error('Failed to update positioning statement');
            }

            const data = await response.json();
            if (data.success) {
                setCurrentPositioning(data.marketing_overview.positioning_statement);
                onPositioningStatementUpdate(data.marketing_overview.positioning_statement);
            } else {
                console.error('Failed to save:', data.error);
                // Optionally, show an error message to the user
            }
        } catch (error) {
            console.error('Error saving positioning statement:', error);
            // Optionally, show an error message to the user
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Marketing Overview</h1>
                <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors"
                >
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
                            "{currentPositioning}"
                        </p>
                    </div>
                </div>
            </Card>
            <EditPositioningModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSavePositioning}
                initialValue={currentPositioning}
            />
        </div>
    );
};

export default MarketingOverviewPage;