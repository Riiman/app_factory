
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Briefcase, Users, CheckCircle, Clock, Activity } from 'lucide-react';

interface RecruitmentOverviewProps {
    startupId: number;
}

const RecruitmentOverview: React.FC<RecruitmentOverviewProps> = ({ startupId }) => {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['recruitment-analytics', startupId],
        queryFn: () => api.getRecruitmentAnalytics(startupId),
        enabled: !!startupId,
    });

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    }

    const { total_jobs, active_jobs, total_candidates, hired_candidates, recent_activity } = analytics || {};

    const stats = [
        { label: 'Active Jobs', value: active_jobs || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Total Candidates', value: total_candidates || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'Hired', value: hired_candidates || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Time to Hire', value: '18 Days', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' }, // Mock data for now
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Recruitment Overview</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <Card key={index} className="flex items-center p-6">
                        <div className={`p-3 rounded-full ${stat.bg} mr-4`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Recent Activity */}
            <Card className="p-6">
                <div className="flex items-center mb-4">
                    <Activity className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                </div>

                <div className="divide-y divide-gray-100">
                    {recent_activity?.length > 0 ? (
                        recent_activity.map((app: any) => (
                            <div key={app.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-900">{app.candidate_name}</p>
                                    <p className="text-sm text-gray-500">Applied for <span className="text-brand-primary">{app.job_title}</span></p>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(app.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm py-4">No recent activity found.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default RecruitmentOverview;
