/**
 * @file BusinessOverviewPage.tsx
 * @description Enhanced business dashboard with PowerBI-style analytics
 * Displays unit economics, customer growth, revenue breakdown, and burn metrics
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Edit, TrendingUp, Target, Users, DollarSign, Zap, TrendingDown, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatCompactCurrency, formatDate } from '@/utils/formatters';
import EditBusinessOverviewModal from '@/modules/business/components/EditBusinessOverviewModal';
import { BusinessOverview, BusinessModel } from '@/types/dashboard-types';
import { MetricCard, ComparisonBar, GaugeChart } from '@/components/charts';

interface BusinessOverviewPageProps {
    startupId: number;
    onNavigate: (subPage: string) => void;
}

const BusinessOverviewPage: React.FC<BusinessOverviewPageProps> = ({ startupId, onNavigate }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Existing queries
    const { data: businessOverview } = useQuery({
        queryKey: ['businessOverview', startupId],
        queryFn: () => api.getBusinessOverview(startupId),
        enabled: !!startupId,
    });

    const { data: businessModels = [] } = useQuery<BusinessModel[]>({
        queryKey: ['business-models', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/business-models`);
            return res.business_models;
        },
        enabled: !!startupId
    });

    const { data: monthlyData = [] } = useQuery({
        queryKey: ['businessMonthlyReports', startupId],
        queryFn: () => api.getBusinessMonthlyReports(startupId),
        enabled: !!startupId,
    });

    // New analytics queries
    const { data: unitEconomics = [] } = useQuery({
        queryKey: ['unitEconomics', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/unit-economics`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: customerGrowth = [] } = useQuery({
        queryKey: ['customerGrowth', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/customer-growth`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: revenueBreakdown = [] } = useQuery({
        queryKey: ['revenueBreakdown', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/revenue-breakdown`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: burnMetrics } = useQuery({
        queryKey: ['burnMetrics', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/burn-metrics`);
            return res.data;
        },
        enabled: !!startupId
    });

    const sortedData = [...monthlyData].sort((a, b) => new Date(a.month_start).getTime() - new Date(b.month_start).getTime());

    const handleUpdateBusinessOverview = async (updatedData: Partial<BusinessOverview>) => {
        try {
            await api.updateBusinessOverview(startupId, updatedData);
            queryClient.invalidateQueries({ queryKey: ['businessOverview', startupId] });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update business overview:", error);
        }
    };

    // Prepare data for charts
    const arpuComparisonData = unitEconomics.map((ue: any) => ({
        name: ue.model_name,
        actual: ue.actual_arpu || 0,
        target: ue.target_arpu || 0
    }));

    const marginComparisonData = unitEconomics.map((ue: any) => ({
        name: ue.model_name,
        actual: ue.actual_margin || 0,
        target: ue.target_margin || 0
    }));

    const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

    // Calculate aggregate metrics
    const totalRevenue = unitEconomics.reduce((sum: number, ue: any) => sum + (ue.revenue || 0), 0);
    const avgLtvCacRatio = unitEconomics.length > 0
        ? unitEconomics.reduce((sum: number, ue: any) => sum + (ue.ltv_cac_ratio || 0), 0) / unitEconomics.length
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Business Command Center</h1>
                <div className="flex gap-2">
                    <button onClick={() => onNavigate('Business Models')} className="flex items-center px-4 py-2 bg-brand-primary text-white border border-transparent rounded-md hover:bg-opacity-90 transition-colors shadow-sm">
                        <Target className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Manage Models</span>
                    </button>
                    <button onClick={() => setIsEditModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                        <Edit className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Edit Strategy</span>
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={totalRevenue}
                    format="currency"
                    icon={<DollarSign className="w-6 h-6" />}
                    iconBgColor="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Avg LTV:CAC Ratio"
                    value={avgLtvCacRatio.toFixed(2)}
                    subtitle={avgLtvCacRatio >= 3 ? "Healthy" : "Needs Improvement"}
                    icon={<TrendingUp className="w-6 h-6" />}
                    iconBgColor={avgLtvCacRatio >= 3 ? "bg-green-50" : "bg-amber-50"}
                    iconColor={avgLtvCacRatio >= 3 ? "text-green-600" : "text-amber-600"}
                />
                <MetricCard
                    title="Runway"
                    value={burnMetrics?.runway_months || 0}
                    subtitle="months"
                    icon={<Zap className="w-6 h-6" />}
                    iconBgColor={(burnMetrics?.runway_months || 0) >= 12 ? "bg-green-50" : "bg-red-50"}
                    iconColor={(burnMetrics?.runway_months || 0) >= 12 ? "text-green-600" : "text-red-600"}
                />
                <MetricCard
                    title="Burn Multiple"
                    value={burnMetrics?.burn_multiple || 0}
                    subtitle={(burnMetrics?.burn_multiple || 0) <= 1.5 ? "Efficient" : "High"}
                    icon={<AlertCircle className="w-6 h-6" />}
                    iconBgColor={(burnMetrics?.burn_multiple || 0) <= 1.5 ? "bg-green-50" : "bg-amber-50"}
                    iconColor={(burnMetrics?.burn_multiple || 0) <= 1.5 ? "text-green-600" : "text-amber-600"}
                />
            </div>

            {/* Financial Performance Chart */}
            <Card title="Financial Performance">
                <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month_start" tickFormatter={(date) => formatDate(date, { month: 'short', year: '2-digit' })} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(value) => formatCompactCurrency(value)} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line type="monotone" dataKey="total_revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2} activeDot={{ r: 6 }} dot={false} />
                            <Line type="monotone" dataKey="net_burn" name="Burn Rate" stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="cash_in_bank" name="Cash Balance" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Unit Economics Section */}
            {unitEconomics.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="ARPU: Actual vs Target">
                        <ComparisonBar
                            data={arpuComparisonData}
                            height={300}
                            formatValue={(value) => `$${value.toFixed(0)}`}
                        />
                    </Card>

                    <Card title="Margin: Actual vs Target">
                        <ComparisonBar
                            data={marginComparisonData}
                            height={300}
                            formatValue={(value) => `${value.toFixed(1)}%`}
                        />
                    </Card>
                </div>
            )}

            {/* Customer Growth & Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Growth Chart */}
                {customerGrowth.length > 0 && (
                    <Card title="Customer Growth">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={customerGrowth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(date) => formatDate(date, { month: 'short' })}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="new_customers" name="New" stroke="#10b981" strokeWidth={2} />
                                    <Line type="monotone" dataKey="churned_customers" name="Churned" stroke="#ef4444" strokeWidth={2} />
                                    <Line type="monotone" dataKey="net_growth" name="Net Growth" stroke="#0ea5e9" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {/* Revenue Breakdown Pie Chart */}
                {revenueBreakdown.length > 0 && (
                    <Card title="Revenue by Business Model">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={revenueBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.model_name}: ${entry.percentage.toFixed(1)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="revenue"
                                    >
                                        {revenueBreakdown.map((entry: any, index: number) => (
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

            {/* Active Business Models */}
            <Card title="Active Business Models">
                {businessModels.length > 0 ? (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {businessModels.map(model => {
                            const modelEconomics = unitEconomics.find((ue: any) => ue.model_id === model.id);

                            return (
                                <div key={model.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-gray-50 -mx-4 px-4 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-gray-900 truncate">{model.name}</h4>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${model.status === 'ACTIVE'
                                                ? 'bg-green-50 text-green-700 border border-green-100'
                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {model.model_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate max-w-[250px]">{model.description || 'No description provided'}</p>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm">
                                        {/* Revenue */}
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Revenue</div>
                                            <div className="font-semibold text-gray-900">
                                                {model.actual_revenue ? formatCompactCurrency(model.actual_revenue) : '-'}
                                            </div>
                                        </div>

                                        {/* ARPU */}
                                        {modelEconomics && (
                                            <div className="text-right min-w-[80px]">
                                                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">ARPU</div>
                                                <div className={`font-semibold ${modelEconomics.actual_arpu >= (modelEconomics.target_arpu || 0)
                                                    ? 'text-green-600'
                                                    : 'text-amber-600'
                                                    }`}>
                                                    ${modelEconomics.actual_arpu.toFixed(0)}
                                                </div>
                                                {modelEconomics.target_arpu > 0 && (
                                                    <div className="text-[10px] text-gray-400">Target: ${modelEconomics.target_arpu}</div>
                                                )}
                                            </div>
                                        )}

                                        {/* LTV:CAC */}
                                        {modelEconomics && modelEconomics.ltv_cac_ratio > 0 && (
                                            <div className="text-right min-w-[70px]">
                                                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">LTV:CAC</div>
                                                <div className={`font-semibold ${modelEconomics.ltv_cac_ratio >= 3
                                                    ? 'text-green-600'
                                                    : 'text-amber-600'
                                                    }`}>
                                                    {modelEconomics.ltv_cac_ratio.toFixed(1)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Transactions */}
                                        <div className="text-right min-w-[70px]">
                                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sales</div>
                                            <div className="flex items-center justify-end gap-1">
                                                <Users className="h-3 w-3 text-gray-300" />
                                                <span className="font-semibold text-gray-900">{model.transaction_count || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <Target className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p>No business models defined yet.</p>
                        <button onClick={() => onNavigate('Business Models')} className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2">Create First Model &rarr;</button>
                    </div>
                )}
            </Card>

            {/* Strategy Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Business Strategy">
                    {businessOverview?.business_model ? (
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{businessOverview.business_model}</div>
                    ) : (
                        <div className="text-gray-500 italic">No business strategy provided.</div>
                    )}
                </Card>

                <Card title="Strategic Partners">
                    {businessOverview?.key_partners ? (
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{businessOverview.key_partners}</div>
                    ) : (
                        <div className="text-gray-500 italic">No key partners listed.</div>
                    )}
                </Card>
            </div>

            {isEditModalOpen && (
                <EditBusinessOverviewModal
                    onClose={() => setIsEditModalOpen(false)}
                    onUpdate={handleUpdateBusinessOverview}
                    businessOverview={businessOverview || {} as BusinessOverview}
                />
            )}
        </div>
    );
};

export default BusinessOverviewPage;