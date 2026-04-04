/**
 * @file SalesOverviewPage.tsx
 * @description Enhanced CRM dashboard with sales funnel, conversion rates, and deal velocity
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { BarChart2, TrendingUp, DollarSign, Activity, Award, Target, Clock, Zap } from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters';
import { MetricCard, FunnelChart, GaugeChart } from '@/components/charts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SalesOverviewPageProps {
    startupId: number;
}

const SalesOverviewPage: React.FC<SalesOverviewPageProps> = ({ startupId }) => {
    // Fetch analytics data
    const { data: salesFunnel = [] } = useQuery({
        queryKey: ['salesFunnel', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/crm/sales-funnel`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: conversionRates = [] } = useQuery({
        queryKey: ['conversionRates', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/crm/conversion-rates`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: dealVelocity } = useQuery({
        queryKey: ['dealVelocity', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/crm/deal-velocity`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: winRate } = useQuery({
        queryKey: ['winRate', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/crm/win-rate`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: pipelineHealth } = useQuery({
        queryKey: ['pipelineHealth', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/crm/pipeline-health`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: activityMetrics } = useQuery({
        queryKey: ['activityMetrics', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/crm/activity-metrics`);
            return res.data;
        },
        enabled: !!startupId
    });

    // Fetch recent wins from existing CRM API
    const { data: analytics } = useQuery({
        queryKey: ['crmAnalytics', startupId],
        queryFn: async () => {
            const res = await api.get(`/crm/analytics?startup_id=${startupId}`);
            return res;
        },
        enabled: !!startupId
    });

    // Prepare funnel data for visualization
    const funnelData = salesFunnel.map((stage: any) => ({
        stage: stage.stage.replace(/_/g, ' '),
        value: stage.value,
        count: stage.count
    }));

    // Prepare conversion rate data for bar chart
    const conversionData = conversionRates.map((conv: any) => ({
        name: conv.to_stage.replace(/_/g, ' ').substring(0, 15),
        rate: conv.conversion_rate
    }));

    const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Sales Intelligence</h1>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Pipeline Value"
                    value={pipelineHealth?.total_pipeline_value || 0}
                    format="currency"
                    icon={<DollarSign className="w-6 h-6" />}
                    iconBgColor="bg-green-50"
                    iconColor="text-green-600"
                />
                <MetricCard
                    title="Win Rate"
                    value={winRate?.win_rate || 0}
                    format="percentage"
                    subtitle={`${winRate?.won_count || 0} won / ${winRate?.total_closed || 0} total`}
                    icon={<Award className="w-6 h-6" />}
                    iconBgColor={((winRate?.win_rate || 0) >= 30) ? "bg-green-50" : "bg-amber-50"}
                    iconColor={((winRate?.win_rate || 0) >= 30) ? "text-green-600" : "text-amber-600"}
                />
                <MetricCard
                    title="Avg Days to Close"
                    value={dealVelocity?.avg_days_to_close || 0}
                    subtitle="days"
                    icon={<Clock className="w-6 h-6" />}
                    iconBgColor="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Active Deals"
                    value={pipelineHealth?.total_deals || 0}
                    subtitle={`Avg: ${formatCurrency(pipelineHealth?.avg_deal_size || 0)}`}
                    icon={<BarChart2 className="w-6 h-6" />}
                    iconBgColor="bg-purple-50"
                    iconColor="text-purple-600"
                />
            </div>

            {/* Sales Funnel */}
            {funnelData.length > 0 && (
                <Card title="Sales Pipeline Funnel">
                    <FunnelChart
                        data={funnelData}
                        height={400}
                        formatValue={(value) => formatCurrency(value)}
                        showLabels={true}
                    />
                </Card>
            )}

            {/* Conversion Rates & Deal Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Rates */}
                {conversionData.length > 0 && (
                    <Card title="Stage Conversion Rates">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={conversionData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `${value}%`}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => `${value}%`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                                        {conversionData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {/* Deal Velocity Metrics */}
                {dealVelocity && (
                    <Card title="Deal Velocity (Last 30 Days)">
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-sm text-gray-500 mb-1">Deals Closed</div>
                                    <div className="text-2xl font-bold text-gray-900">{dealVelocity.total_closed}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-sm text-gray-500 mb-1">Total Value</div>
                                    <div className="text-2xl font-bold text-gray-900">{formatCompactCurrency(dealVelocity.total_value_closed)}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-500 mb-1">Average Deal Size</div>
                                <div className="text-2xl font-bold text-gray-900">{formatCurrency(dealVelocity.avg_deal_size)}</div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-500 mb-1">Average Time to Close</div>
                                <div className="text-2xl font-bold text-gray-900">{dealVelocity.avg_days_to_close} days</div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Activity Metrics & Recent Wins */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Metrics */}
                {activityMetrics && (
                    <Card title="Sales Activity (Last 30 Days)">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="text-sm text-gray-500">Total Interactions</div>
                                    <div className="text-2xl font-bold text-gray-900">{activityMetrics.total_interactions}</div>
                                </div>
                                <Activity className="h-8 w-8 text-blue-500" />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="text-sm text-gray-500">Active Contacts</div>
                                    <div className="text-2xl font-bold text-gray-900">{activityMetrics.active_contacts}</div>
                                </div>
                                <Target className="h-8 w-8 text-green-500" />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="text-sm text-gray-500">Avg Per Day</div>
                                    <div className="text-2xl font-bold text-gray-900">{activityMetrics.avg_interactions_per_day}</div>
                                </div>
                                <Zap className="h-8 w-8 text-purple-500" />
                            </div>

                            {/* Interactions by Type */}
                            {activityMetrics.interactions_by_type && Object.keys(activityMetrics.interactions_by_type).length > 0 && (
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="text-sm font-medium text-gray-700 mb-3">By Type</div>
                                    <div className="space-y-2">
                                        {Object.entries(activityMetrics.interactions_by_type).map(([type, count]: [string, any]) => (
                                            <div key={type} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{type}</span>
                                                <span className="font-medium text-gray-900">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Recent Wins */}
                <Card title="Recent Wins">
                    <div className="space-y-3">
                        {analytics?.recent_wins && analytics.recent_wins.length > 0 ? (
                            analytics.recent_wins.map((deal: any) => (
                                <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                            <p className="text-sm font-medium text-gray-900 truncate">{deal.name}</p>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {deal.company_name || deal.contact_name} • {new Date(deal.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-sm font-bold text-green-600">{formatCurrency(deal.amount)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Award className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                <p>No deals closed yet. Keep pushing!</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SalesOverviewPage;
