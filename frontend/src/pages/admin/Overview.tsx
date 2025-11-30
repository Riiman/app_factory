
import React from 'react';
import { Startup, Submission, SubmissionStatus, ActivityLog, DashboardNotification } from '../../types/dashboard-types';
import RecentActivityFeed from '../../components/dashboard/RecentActivityFeed';
import NotificationCenter from '../../components/dashboard/NotificationCenter';
import Card from '../../components/admin/Card';
import StatCard from '../../components/admin/StatCard';
import StartupStagePieChart from '../../components/admin/charts/StartupStagePieChart';
import { Briefcase, Inbox, FileClock, FileSignature, CheckCircle, PlusCircle } from 'lucide-react';

interface OverviewProps {
    startups: Startup[];
    submissions: Submission[];
    activity: ActivityLog[];
    notifications: DashboardNotification[];
    onMarkAsRead: (id: number) => void;
}

const Overview: React.FC<OverviewProps> = ({ startups, submissions, activity, notifications, onMarkAsRead }) => {
    const activeStartupsCount = startups.filter(s =>
        ['IDEA', 'MVP', 'GROWTH'].includes(s.current_stage?.toUpperCase())
    ).length;

    const pendingSubmissionsCount = submissions.filter(s => s.status?.toUpperCase() === SubmissionStatus.PENDING).length;
    const inReviewCount = submissions.filter(s => s.status?.toUpperCase() === SubmissionStatus.IN_REVIEW).length;
    const onboardingCount = startups.filter(s => ['SCOPING', 'CONTRACT'].includes(s.current_stage?.toUpperCase())).length;




    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-text-primary">Dashboard Overview</h2>
                <NotificationCenter notifications={notifications} onMarkAsRead={onMarkAsRead} align="right" />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={<Briefcase size={20} />} label="Active Startups" value={activeStartupsCount} />
                <StatCard icon={<Inbox size={20} />} label="Pending Submissions" value={pendingSubmissionsCount} />
                <StatCard icon={<FileClock size={20} />} label="In Review" value={inReviewCount} />
                <StatCard icon={<FileSignature size={20} />} label="In Onboarding" value={onboardingCount} />
            </div>

            {/* Charts and Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Active Startup Stage Distribution" className="lg:col-span-2">
                    <StartupStagePieChart startups={startups} />
                </Card>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Recent Activity</h3>
                    <RecentActivityFeed activities={activity} />
                </div>
            </div>
        </div>
    );
};

export default Overview;
