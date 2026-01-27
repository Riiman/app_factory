/**
 * @file MarketingOverviewPage.tsx
 * @description Enhanced marketing dashboard with channel analytics, CAC, ROI, and funnel
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { TrendingUp, DollarSign, Target, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters';
import { MetricCard, FunnelChart } from '@/components/charts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface MarketingOverviewPageProps {
    startupId: number;
    isGeneratingGtm?: boolean;
}

const MarketingOverviewPage: React.FC<MarketingOverviewPageProps> = ({ startupId, isGeneratingGtm }) => {
    if (isGeneratingGtm) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                <p className="text-gray-600 font-medium">Generating your Marketing Strategy...</p>
            </div>
        );
    }
    // Fetch analytics data
    const { data: channelPerformance = [] } = useQuery({
        queryKey: ['channelPerformance', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/marketing/channel-performance`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: cacByChannel = [] } = useQuery({
        queryKey: ['cacByChannel', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/marketing/cac-by-channel`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: marketingFunnel = [] } = useQuery({
        queryKey: ['marketingFunnel', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/marketing/funnel`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: campaignROI = [] } = useQuery({
        queryKey: ['campaignROI', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/marketing/campaign-roi`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: spendAllocation = [] } = useQuery({
        queryKey: ['spendAllocation', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/marketing/spend-allocation`);
            return res.data;
        },
        enabled: !!startupId
    });

    // Calculate aggregate metrics
    const totalSpend = channelPerformance.reduce((sum: number, ch: any) => sum + (ch.spend || 0), 0);
    const totalConversions = channelPerformance.reduce((sum: number, ch: any) => sum + (ch.conversions || 0), 0);
    const avgCAC = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const totalImpressions = channelPerformance.reduce((sum: number, ch: any) => sum + (ch.impressions || 0), 0);

    const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

    // Prepare radar chart data for channel comparison
    const radarData = channelPerformance.map((ch: any) => ({
        channel: ch.channel,
        ctr: ch.ctr || 0,
        conversionRate: ch.conversion_rate || 0,
        efficiency: ch.conversions > 0 ? (ch.conversions / (ch.spend / 1000)) : 0
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Marketing Intelligence</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Spend"
                    value={totalSpend}
                    format="currency"
                    icon={<DollarSign className="w-6 h-6" />}
                    iconBgColor="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <MetricCard
                    title="Total Conversions"
                    value={totalConversions}
                    icon={<Target className="w-6 h-6" />}
                    iconBgColor="bg-green-50"
                    iconColor="text-green-600"
                />
                <MetricCard
                    title="Avg CAC"
                    value={avgCAC}
                    format="currency"
                    icon={<TrendingUp className="w-6 h-6" />}
                    iconBgColor="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Total Impressions"
                    value={totalImpressions}
                    subtitle={`${channelPerformance.length} channels`}
                    icon={<BarChart2 className="w-6 h-6" />}
                    iconBgColor="bg-amber-50"
                    iconColor="text-amber-600"
                />
            </div>

            {/* Marketing Funnel & CAC by Channel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {marketingFunnel.length > 0 && (
                    <Card title="Marketing Funnel">
                        <FunnelChart
                            data={marketingFunnel}
                            height={280}
                            formatValue={(value) => value.toLocaleString()}
                        />
                    </Card>
                )}

                {cacByChannel.length > 0 && (
                    <Card title="CAC by Channel">
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cacByChannel} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="channel"
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `$${value}`}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="cac" radius={[4, 4, 0, 0]}>
                                        {cacByChannel.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
            </div>

            {/* Channel Performance Table & Spend Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {channelPerformance.length > 0 && (
                    <Card title="Channel Performance">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spend</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CAC</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {channelPerformance.map((ch: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{ch.channel}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCompactCurrency(ch.spend || 0)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-600">{ch.conversions || 0}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-600">{(ch.ctr || 0).toFixed(1)}%</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">${(ch.cac || 0).toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {spendAllocation.length > 0 && (
                    <Card title="Spend Allocation">
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={spendAllocation}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.channel}: ${(entry.percentage || 0).toFixed(1)}%`}
                                        outerRadius={80}
                                        dataKey="spend"
                                    >
                                        {spendAllocation.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
            </div>

            {/* Campaign ROI */}
            {campaignROI.length > 0 && (
                <Card title="Top Campaigns by ROI">
                    <div className="space-y-3">
                        {campaignROI.slice(0, 5).map((campaign: any) => (
                            <div key={campaign.campaign_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{campaign.campaign_name}</p>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{campaign.channel}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Spend: {formatCurrency(campaign.spend)} • Conversions: {campaign.conversions}
                                    </p>
                                </div>
                                <div className="text-right ml-4">
                                    <p className={`text-sm font-bold ${(campaign.roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(campaign.roi || 0) >= 0 ? '+' : ''}{(campaign.roi || 0).toFixed(1)}% ROI
                                    </p>
                                    <p className="text-xs text-gray-500">{formatCompactCurrency(campaign.estimated_revenue || 0)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default MarketingOverviewPage;