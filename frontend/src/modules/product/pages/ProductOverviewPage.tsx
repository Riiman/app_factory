/**
 * @file ProductOverviewPage.tsx
 * @description Product module overview dashboard with key metrics and analytics
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Package, CheckCircle, Zap, Rocket, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { MetricCard } from '@/components/charts';
import { formatDate } from '@/utils/formatters';

interface ProductOverviewPageProps {
    startupId: number;
    onNavigate: (subPage: string) => void;
}

const ProductOverviewPage: React.FC<ProductOverviewPageProps> = ({ startupId, onNavigate }) => {
    // Fetch analytics data
    const { data: overview } = useQuery({
        queryKey: ['productOverview', startupId],
        queryFn: async () => {
            const res = await api.get('/planner/analytics/overview');
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: featureDistribution = [] } = useQuery({
        queryKey: ['featureDistribution', startupId],
        queryFn: async () => {
            const res = await api.get('/planner/analytics/feature-distribution');
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: sprintVelocity = [] } = useQuery({
        queryKey: ['sprintVelocity', startupId],
        queryFn: async () => {
            const res = await api.get('/planner/analytics/sprint-velocity');
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: releaseTimeline } = useQuery({
        queryKey: ['releaseTimeline', startupId],
        queryFn: async () => {
            const res = await api.get('/planner/analytics/release-timeline');
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: productHealth } = useQuery({
        queryKey: ['productHealth', startupId],
        queryFn: async () => {
            const res = await api.get('/planner/analytics/product-health');
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: recentActivity = [] } = useQuery({
        queryKey: ['productRecentActivity', startupId],
        queryFn: async () => {
            const res = await api.get('/planner/analytics/recent-activity');
            return res.data;
        },
        enabled: !!startupId
    });

    // Chart colors
    const STATUS_COLORS: Record<string, string> = {
        'BACKLOG': '#94a3b8',
        'PLANNED': '#fbbf24',
        'IN_PROGRESS': '#3b82f6',
        'IN_REVIEW': '#8b5cf6',
        'DONE': '#10b981',
        'SHIPPED': '#059669'
    };

    const healthScore = productHealth?.health_score || 0;
    const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-amber-600' : 'text-red-600';
    const healthBg = healthScore >= 80 ? 'bg-green-50' : healthScore >= 60 ? 'bg-amber-50' : 'bg-red-50';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Product Command Center</h1>
                <button
                    onClick={() => onNavigate('Products List')}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary transition-colors shadow-sm"
                >
                    <Package className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Manage Products</span>
                </button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Products"
                    value={overview?.total_products || 0}
                    icon={<Package className="w-6 h-6" />}
                    iconBgColor="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Features Completed"
                    value={overview?.completed_features || 0}
                    subtitle={`${overview?.completion_rate || 0}% complete`}
                    icon={<CheckCircle className="w-6 h-6" />}
                    iconBgColor="bg-green-50"
                    iconColor="text-green-600"
                />
                <MetricCard
                    title="Active Sprints"
                    value={overview?.active_sprints || 0}
                    icon={<Zap className="w-6 h-6" />}
                    iconBgColor="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <MetricCard
                    title="Upcoming Releases"
                    value={overview?.upcoming_releases || 0}
                    icon={<Rocket className="w-6 h-6" />}
                    iconBgColor="bg-amber-50"
                    iconColor="text-amber-600"
                />
            </div>

            {/* Product Health & Feature Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Health */}
                <Card title="Product Health">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Overall Health Score</div>
                                <div className={`text-4xl font-bold ${healthColor}`}>{healthScore}</div>
                            </div>
                            <div className={`p-4 rounded-full ${healthBg}`}>
                                <AlertCircle className={`w-8 h-8 ${healthColor}`} />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Critical Bugs</span>
                                <span className={`font-semibold ${productHealth?.critical_bugs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {productHealth?.critical_bugs || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Overdue Features</span>
                                <span className={`font-semibold ${productHealth?.overdue_features > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {productHealth?.overdue_features || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Stale Features (90+ days)</span>
                                <span className={`font-semibold ${productHealth?.stale_features > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {productHealth?.stale_features || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Feature Distribution */}
                <Card title="Feature Distribution">
                    {featureDistribution.length > 0 ? (
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={featureDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.status}: ${entry.count}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {featureDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            No feature data available
                        </div>
                    )}
                </Card>
            </div>

            {/* Sprint Velocity */}
            {sprintVelocity.length > 0 && (
                <Card title="Sprint Velocity">
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sprintVelocity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="sprint_name"
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="features_completed"
                                    name="Features Completed"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="capacity"
                                    name="Sprint Capacity"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}

            {/* Release Timeline & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Releases */}
                <Card title="Upcoming Releases">
                    {releaseTimeline?.upcoming && releaseTimeline.upcoming.length > 0 ? (
                        <div className="space-y-3">
                            {releaseTimeline.upcoming.map((release: any) => (
                                <div key={release.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">{release.version}</div>
                                        <div className="text-sm text-gray-500">{release.name}</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {release.completed_features}/{release.feature_count} features complete
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            {formatDate(release.target_date, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full mt-1 ${release.status === 'PLANNED' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {release.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Rocket className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p>No upcoming releases planned</p>
                        </div>
                    )}
                </Card>

                {/* Recent Activity */}
                <Card title="Recent Activity">
                    {recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {recentActivity.map((activity: any, index: number) => (
                                <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className={`p-2 rounded-full ${activity.type === 'feature_completed' ? 'bg-green-100' : 'bg-blue-100'
                                        }`}>
                                        {activity.type === 'feature_completed' ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Rocket className="w-4 h-4 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{activity.title}</div>
                                        <div className="text-xs text-gray-500">
                                            {activity.date ? formatDate(activity.date, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Recently'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <TrendingUp className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p>No recent activity</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ProductOverviewPage;
