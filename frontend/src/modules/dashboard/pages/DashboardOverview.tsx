/**
 * @file DashboardOverview.tsx
 * @description Executive dashboard providing a comprehensive overview of the entire startup
 * with cross-module KPIs, financial performance, growth metrics, and health indicators
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import MetricCard from '@/components/charts/MetricCard';
import TrendIndicator from '@/components/charts/TrendIndicator';
import ModuleHealthCard from '@/components/dashboard/ModuleHealthCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import FunnelChart from '@/components/charts/FunnelChart';
import {
    TrendingUp,
    DollarSign,
    Users,
    Target,
    Flame,
    Wallet,
    TrendingDown,
    Award
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters';

interface DashboardOverviewProps {
    startupId: number;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ startupId }) => {
    // Fetch executive summary data
    const { data: executiveSummary, isLoading, error } = useQuery({
        queryKey: ['executiveSummary', startupId],
        queryFn: async () => {
            console.log('🔍 Fetching executive summary for startup:', startupId);
            const response = await api.get(`/startups/${startupId}/analytics/executive-summary`);
            console.log('📦 API Response:', response);
            console.log('✅ Response data:', response.data);

            // The response.data already contains the full object with success flag
            if (response.data && response.data.success !== false) {
                // Remove the 'success' key and return the rest of the data
                const { success, ...data } = response.data;
                console.log('📊 Executive Summary Data:', data);
                return data;
            }
            console.warn('⚠️ API response not successful or missing data');
            return null;
        },
        enabled: !!startupId,
    });

    // Fetch monthly data for charts
    const { data: dashboardData } = useQuery({
        queryKey: ['dashboardOverview', startupId],
        queryFn: () => api.getDashboardOverview(startupId),
        enabled: !!startupId,
    });

    console.log('🎯 Current state:', {
        isLoading,
        error,
        hasExecutiveSummary: !!executiveSummary,
        executiveSummary,
        hasDashboardData: !!dashboardData
    });

    if (isLoading) return <div className="flex items-center justify-center h-96">Loading dashboard...</div>;
    if (error) {
        console.error('❌ Error loading dashboard:', error);
        return <div className="flex items-center justify-center h-96 text-red-600">Error loading dashboard: {String(error)}</div>;
    }
    if (!executiveSummary) {
        console.warn('⚠️ No executive summary data available');
        return <div className="flex items-center justify-center h-96 text-gray-600">No data available</div>;
    }

    const {
        financial_health,
        growth_metrics,
        module_health,
        acquisition_funnel,
        sales_pipeline,
        alerts,
        recent_wins
    } = executiveSummary;

    const monthly_data = dashboardData?.monthly_data || [];

    // Prepare financial performance chart data
    const financialChartData = monthly_data.slice(-6).map((d: any) => ({
        month: new Date(d.month_start).toLocaleDateString('en-US', { month: 'short' }),
        revenue: d.total_revenue || 0,
        expenses: d.total_expenses || 0,
        cash: d.cash_in_bank || 0,
        burn: Math.abs(d.net_burn || 0)
    }));

    // Prepare acquisition funnel data
    const funnelData = [
        { stage: 'Impressions', value: acquisition_funnel.impressions, label: formatCompactCurrency(acquisition_funnel.impressions) },
        { stage: 'Clicks', value: acquisition_funnel.clicks, label: formatCompactCurrency(acquisition_funnel.clicks) },
        { stage: 'Leads', value: acquisition_funnel.leads, label: formatCompactCurrency(acquisition_funnel.leads) },
        { stage: 'Customers', value: acquisition_funnel.customers, label: formatCompactCurrency(acquisition_funnel.customers) }
    ];

    // Prepare sales pipeline mini funnel
    const salesFunnelData = sales_pipeline.by_stage?.slice(0, 4).map((stage: any) => ({
        stage: stage.stage,
        value: stage.value,
        label: formatCompactCurrency(stage.value)
    })) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Top-Level KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={formatCurrency(financial_health.total_revenue)}
                    icon={<DollarSign className="h-6 w-6" />}
                    trend={{ value: financial_health.revenue_trend, label: "vs last month" }}
                />
                <MetricCard
                    title="Burn Rate"
                    value={formatCurrency(financial_health.burn_rate)}
                    icon={<Flame className="h-6 w-6" />}
                    trend={{ value: -financial_health.burn_trend, label: "vs last month" }}
                />
                <MetricCard
                    title="Cash Balance"
                    value={formatCurrency(financial_health.cash_balance)}
                    icon={<Wallet className="h-6 w-6" />}
                    subtitle={`${financial_health.runway_months.toFixed(1)} months runway`}
                />
                <MetricCard
                    title="Gross Margin"
                    value={`${financial_health.gross_margin.toFixed(1)}%`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    subtitle={`Target: ${financial_health.margin_target}%`}
                />
            </div>

            {/* Second Row KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Customers"
                    value={growth_metrics.customer_count.toString()}
                    icon={<Users className="h-6 w-6" />}
                    trend={{ value: growth_metrics.customer_growth_rate, label: "MoM growth" }}
                />
                <MetricCard
                    title="MRR"
                    value={formatCurrency(growth_metrics.mrr)}
                    icon={<TrendingUp className="h-6 w-6" />}
                    trend={{ value: growth_metrics.mrr_growth, label: "MoM growth" }}
                />
                <MetricCard
                    title="Pipeline Value"
                    value={formatCompactCurrency(growth_metrics.total_pipeline_value)}
                    icon={<Target className="h-6 w-6" />}
                    subtitle="CRM + Fundraising"
                />
                <MetricCard
                    title="LTV:CAC Ratio"
                    value={growth_metrics.ltv_cac_ratio.toFixed(1)}
                    icon={<Award className="h-6 w-6" />}
                    subtitle={growth_metrics.ltv_cac_ratio >= 3 ? 'Healthy' : 'Needs improvement'}
                />
            </div>

            {/* Financial Performance Chart */}
            <Card title="Financial Performance">
                <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={financialChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(value) => formatCompactCurrency(value)} />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="cash" stroke="#3b82f6" strokeWidth={2} name="Cash Balance" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="burn" stroke="#f59e0b" strokeWidth={2} name="Burn Rate" dot={{ r: 4 }} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Growth Dashboard - 2x2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Sales Pipeline */}
                <Card title="Sales Pipeline Health">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Total Value</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCompactCurrency(sales_pipeline.total_value)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Win Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{sales_pipeline.win_rate.toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Active Deals</p>
                                <p className="text-2xl font-bold text-gray-900">{sales_pipeline.deal_count}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Avg Deal Size</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCompactCurrency(sales_pipeline.avg_deal_size)}</p>
                            </div>
                        </div>
                        {salesFunnelData.length > 0 && (
                            <div className="pt-4 border-t">
                                <p className="text-xs text-gray-500 mb-2">Pipeline by Stage</p>
                                <FunnelChart data={salesFunnelData} height={180} />
                            </div>
                        )}
                    </div>
                </Card>

                {/* Product Development (Placeholder) */}
                <Card title="Product Development">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Features Completed</p>
                                <p className="text-2xl font-bold text-gray-900">{module_health.product.features_completed}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Features</p>
                                <p className="text-2xl font-bold text-gray-900">{module_health.product.total_features}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Critical Bugs</p>
                                <p className="text-2xl font-bold text-red-600">{module_health.product.bugs}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Completion Rate</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {module_health.product.total_features > 0
                                        ? ((module_health.product.features_completed / module_health.product.total_features) * 100).toFixed(0)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Fundraising Status */}
                <Card title="Fundraising Status">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Active Investors</p>
                                <p className="text-2xl font-bold text-gray-900">{module_health.fundraising.active_investors}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Cash Runway</p>
                                <p className="text-2xl font-bold text-gray-900">{module_health.accounting.runway.toFixed(1)} mo</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-xs text-gray-500 mb-2">Status</p>
                            <p className="text-sm text-gray-700">{module_health.fundraising.key_metric}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Module Health Dashboard */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Module Health</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ModuleHealthCard
                        module="business"
                        status={module_health.business.status}
                        keyMetric={module_health.business.key_metric}
                    />
                    <ModuleHealthCard
                        module="crm"
                        status={module_health.crm.status}
                        keyMetric={module_health.crm.key_metric}
                    />
                    <ModuleHealthCard
                        module="marketing"
                        status={module_health.marketing.status}
                        keyMetric={module_health.marketing.key_metric}
                    />
                    <ModuleHealthCard
                        module="product"
                        status={module_health.product.status}
                        keyMetric={module_health.product.key_metric}
                    />
                    <ModuleHealthCard
                        module="accounting"
                        status={module_health.accounting.status}
                        keyMetric={module_health.accounting.key_metric}
                    />
                    <ModuleHealthCard
                        module="fundraising"
                        status={module_health.fundraising.status}
                        keyMetric={module_health.fundraising.key_metric}
                    />
                </div>
            </div>

            {/* Insights & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alerts */}
                <Card title="Priority Alerts">
                    <AlertsPanel alerts={alerts} maxAlerts={5} />
                </Card>

                {/* Recent Wins */}
                <Card title="Recent Wins">
                    {recent_wins.length > 0 ? (
                        <div className="space-y-3">
                            {recent_wins.map((win: any, index: number) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <Award className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{win.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-green-700 font-medium uppercase">{win.module}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(win.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">No recent wins to display</p>
                            <p className="text-xs text-gray-400 mt-1">Keep pushing forward!</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverview;