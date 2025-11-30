/**
 * @file DashboardOverview.tsx
 * @description The main dashboard overview page, serving as the landing page for the application.
 * It provides a "mission control" view of the startup with KPIs, charts, upcoming tasks,
 * and recent activity.
 */

import React from 'react';
import { Startup, TaskStatus, ExperimentStatus, ActivityLog } from '@/types/dashboard-types';
import Card from '@/components/Card';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import { TrendingUp, Target, ListTodo, Beaker, Activity, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Props for the DashboardOverview component.
 * @interface DashboardOverviewProps
 */
interface DashboardOverviewProps {
    /** The main startup data object containing all information needed for the dashboard. The backend should provide an object conforming to the `Startup` interface. */
    startupData: Startup;
    recentActivity: ActivityLog[];
}

/**
 * A small, reusable card component for displaying a single Key Performance Indicator (KPI).
 * @param {object} props - The component props.
 * @param {string} props.title - The title of the KPI.
 * @param {string} props.value - The value of the KPI.
 * @param {React.ElementType} props.icon - The icon component to display.
 */
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

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ startupData, recentActivity }) => {
    const { business_monthly_data = [], tasks = [], experiments = [], next_milestone, overall_progress } = startupData;
    // FIX: Provide a default object shape for latestData to prevent type errors when business_monthly_data is empty.
    const latestData = business_monthly_data[business_monthly_data.length - 1] || { mrr: 0, net_burn: 0, total_customers: 0 };
    const upcomingTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 5);
    const activeExperiments = experiments.filter(e => e.status === ExperimentStatus.RUNNING).slice(0, 3);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Monthly Recurring Revenue" value={`$${(latestData.mrr || 0).toLocaleString()}`} icon={TrendingUp} />
                <KpiCard title="Net Burn" value={`-$${Math.abs(latestData.net_burn || 0).toLocaleString()}`} icon={TrendingUp} />
                <KpiCard title="Total Customers" value={`${latestData.total_customers || 0}`} icon={Users} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="Business Performance">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={business_monthly_data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month_start" tickFormatter={(date) => new Date(date).toLocaleString('default', { month: 'short' })} />
                                    <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                    <Bar dataKey="mrr" fill="#4F46E5" name="MRR" />
                                    <Bar dataKey="net_burn" fill="#EF4444" name="Net Burn" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Next Milestone" actions={<button className="text-sm text-brand-primary font-medium">Update</button>}>
                        <div className="flex items-center">
                            <Target className="h-8 w-8 text-brand-secondary mr-4" />
                            <div>
                                <p className="font-semibold text-gray-800">{next_milestone}</p>
                                <p className="text-sm text-gray-500">Target: End of Q3 2024</p>
                            </div>
                        </div>
                    </Card>
                    <Card title="Overall Progress">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-brand-primary h-4 rounded-full" style={{ width: `${overall_progress}%` }}></div>
                        </div>
                        <p className="text-right text-sm font-medium mt-2">{overall_progress}% Complete</p>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card title="Upcoming Tasks">
                    <ul className="space-y-3">
                        {upcomingTasks.map(task => (
                            <li key={task.id} className="flex items-center text-sm">
                                <ListTodo className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                                <span className="flex-1 text-gray-700">{task.name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{task.status}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card title="Active Experiments">
                    <ul className="space-y-3">
                        {activeExperiments.map(exp => (
                            <li key={exp.id} className="flex items-start text-sm">
                                <Beaker className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{exp.name}</p>
                                    <p className="text-gray-500">{exp.assumption}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card title="Recent Activity">
                    <RecentActivityFeed activities={recentActivity} />
                </Card>
            </div>

        </div>
    );
};

export default DashboardOverview;