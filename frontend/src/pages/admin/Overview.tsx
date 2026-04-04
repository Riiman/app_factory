
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { Startup, Submission, SubmissionStatus, ActivityLog, DashboardNotification } from '../../types/dashboard-types';
import RecentActivityFeed from '@/modules/dashboard/components/RecentActivityFeed';
import NotificationCenter from '@/modules/dashboard/components/NotificationCenter';
import Card from '../../components/admin/Card';
import StatCard from '../../components/admin/StatCard';
import StartupStagePieChart from '../../components/admin/charts/StartupStagePieChart';
import MetricCard from '@/components/charts/MetricCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import {
    Briefcase,
    Inbox,
    FileClock,
    FileSignature,
    DollarSign,
    Flame,
    Wallet,
    Users,
    TrendingUp,
    TrendingDown,
    AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters';

interface OverviewProps {
    startups: Startup[];
    submissions: Submission[];
    activity: ActivityLog[];
    notifications: DashboardNotification[];
    onMarkAsRead: (id: number) => void;
}

const Overview: React.FC<OverviewProps> = ({ startups, submissions, activity, notifications, onMarkAsRead }) => {
    // Fetch portfolio analytics
    const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
        queryKey: ['adminPortfolio'],
        queryFn: async () => {
            try {
                const response = await api.get('/admin/analytics/portfolio-summary');
                return response.data || null;
            } catch (error) {
                console.error('Error fetching portfolio metrics:', error);
                return null;
            }
        },
        refetchInterval: 60000, // Refresh every minute
    });

    // Fetch startup rankings
    const { data: rankingsData } = useQuery({
        queryKey: ['adminRankings'],
        queryFn: async () => {
            try {
                const response = await api.get('/admin/analytics/startup-rankings?metric=revenue&limit=5');
                return response.data || [];
            } catch (error) {
                console.error('Error fetching rankings:', error);
                return [];
            }
        },
    });

    // Fetch organization alerts
    const { data: alertsData } = useQuery({
        queryKey: ['adminAlerts'],
        queryFn: async () => {
            try {
                const response = await api.get('/admin/analytics/organization-alerts');
                return response.data || [];
            } catch (error) {
                console.error('Error fetching alerts:', error);
                return [];
            }
        },
    });

    const activeStartupsCount = startups.filter(s =>
        ['ADMITTED', 'IDEA', 'MVP', 'GROWTH'].includes(s.current_stage?.toUpperCase())
    ).length;

    const pendingSubmissionsCount = submissions.filter(s => s.status?.toUpperCase() === SubmissionStatus.PENDING).length;
    const inReviewCount = submissions.filter(s => s.status?.toUpperCase() === SubmissionStatus.IN_REVIEW).length;
    const onboardingCount = startups.filter(s => s.current_stage?.toUpperCase() === 'EVALUATION').length;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-text-primary">Portfolio Dashboard</h2>
                <NotificationCenter notifications={notifications} onMarkAsRead={onMarkAsRead} align="right" />
            </div>

            {/* Workflow Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<Briefcase size={20} />} label="Active Startups" value={activeStartupsCount} />
                <StatCard icon={<Inbox size={20} />} label="Pending Submissions" value={pendingSubmissionsCount} />
                <StatCard icon={<FileClock size={20} />} label="In Review" value={inReviewCount} />
            </div>

            {/* Portfolio Metrics */}
            {portfolioLoading ? (
                <div className="text-center py-8 text-gray-500">Loading portfolio metrics...</div>
            ) : portfolioData ? (
                <>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <MetricCard
                            title="Total Revenue"
                            value={formatCurrency(portfolioData.total_revenue)}
                            icon={<DollarSign className="h-6 w-6" />}
                            subtitle={`Across ${portfolioData.total_startups} startups`}
                        />
                        <MetricCard
                            title="Total Burn Rate"
                            value={formatCurrency(portfolioData.total_burn)}
                            icon={<Flame className="h-6 w-6" />}
                            subtitle="Monthly burn"
                        />
                        <MetricCard
                            title="Total Cash"
                            value={formatCurrency(portfolioData.total_cash)}
                            icon={<Wallet className="h-6 w-6" />}
                            subtitle={`${portfolioData.average_runway.toFixed(1)} mo avg runway`}
                        />
                        <MetricCard
                            title="Total Customers"
                            value={portfolioData.total_customers.toString()}
                            icon={<Users className="h-6 w-6" />}
                            subtitle={`${formatCurrency(portfolioData.total_mrr)} MRR`}
                        />
                    </div>

                    {/* Portfolio Health */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Card title="Healthy Startups" className="bg-green-50 border-green-200">
                            <div className="flex items-center justify-between">
                                <div className="text-4xl font-bold text-green-600">{portfolioData.healthy_startups}</div>
                                <TrendingUp className="h-12 w-12 text-green-400" />
                            </div>
                            <p className="text-sm text-gray-600 mt-2">On track, no critical issues</p>
                        </Card>
                        <Card title="Warning Startups" className="bg-yellow-50 border-yellow-200">
                            <div className="flex items-center justify-between">
                                <div className="text-4xl font-bold text-yellow-600">{portfolioData.warning_startups}</div>
                                <AlertTriangle className="h-12 w-12 text-yellow-400" />
                            </div>
                            <p className="text-sm text-gray-600 mt-2">Needs attention</p>
                        </Card>
                        <Card title="Critical Startups" className="bg-red-50 border-red-200">
                            <div className="flex items-center justify-between">
                                <div className="text-4xl font-bold text-red-600">{portfolioData.critical_startups}</div>
                                <TrendingDown className="h-12 w-12 text-red-400" />
                            </div>
                            <p className="text-sm text-gray-600 mt-2">Requires immediate action</p>
                        </Card>
                    </div>
                </>
            ) : null}

            {/* Charts and Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card title="Active Startup Stage Distribution" className="lg:col-span-2">
                    <StartupStagePieChart startups={startups} />
                </Card>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col">
                    <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Recent Activity</h3>
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
                        <RecentActivityFeed activities={activity.slice(0, 10)} />
                    </div>
                </div>
            </div>

            {/* Top Performers and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <Card title="Top Performers by Revenue">
                    {rankingsData && rankingsData.length > 0 ? (
                        <div className="space-y-3">
                            {rankingsData.map((ranking: any) => (
                                <div key={ranking.startup_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-brand-primary text-white rounded-full font-bold text-sm">
                                            {ranking.rank}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{ranking.startup_name}</p>
                                            <p className="text-xs text-gray-500">
                                                Status: <span className={`font-medium ${ranking.health_status === 'healthy' ? 'text-green-600' :
                                                    ranking.health_status === 'warning' ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>{ranking.health_status}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{formatCompactCurrency(ranking.metric_value)}</p>
                                        <p className="text-xs text-gray-500">Revenue</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </Card>

                {/* Critical Alerts */}
                <Card title="Priority Alerts">
                    {alertsData ? (
                        <AlertsPanel alerts={alertsData.slice(0, 5)} maxAlerts={5} />
                    ) : (
                        <div className="text-center py-8 text-gray-500">No alerts</div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Overview;
