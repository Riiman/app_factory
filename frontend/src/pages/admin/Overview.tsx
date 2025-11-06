
import React from 'react';
import { Startup, Submission, SubmissionStatus } from '../../types/admin-types';
import Card from '../../components/admin/Card';
import StatCard from '../../components/admin/StatCard';
import StartupStagePieChart from '../../components/admin/charts/StartupStagePieChart';
import { Briefcase, Inbox, FileClock, FileSignature, CheckCircle, PlusCircle } from 'lucide-react';

interface OverviewProps {
  startups: Startup[];
  submissions: Submission[];
}

const Overview: React.FC<OverviewProps> = ({ startups, submissions }) => {
    const activeStartupsCount = startups.filter(s => 
        s.currentStage === 'IDEA' || s.currentStage === 'MVP' || s.currentStage === 'GROWTH'
    ).length;
    
    const pendingSubmissionsCount = submissions.filter(s => s.status === SubmissionStatus.PENDING).length;
    const inReviewCount = submissions.filter(s => s.status === SubmissionStatus.IN_REVIEW).length;
    const onboardingCount = startups.filter(s => s.currentStage === 'SCOPING' || s.currentStage === 'CONTRACT').length;

    const recentActivities = [
        ...submissions
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .slice(0, 2)
            .map(s => ({ type: 'submission' as const, data: s, date: new Date(s.submittedAt) })),
        ...startups
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 2)
            .map(s => ({ type: 'startup_created' as const, data: s, date: new Date(s.createdAt) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());


  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-brand-text-primary mb-6">Dashboard Overview</h2>
      
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
        <Card title="Recent Activity">
            <ul className="space-y-4">
                {recentActivities.map((activity, index) => (
                    <li key={index} className="flex items-start space-x-3">
                        <div className={`mt-1 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${activity.type === 'submission' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {activity.type === 'submission' ? <PlusCircle size={16} /> : <CheckCircle size={16} />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-brand-text-primary">
                                {activity.type === 'submission' ? 'New Submission' : 'Startup Created'}
                            </p>
                            <p className="text-sm text-brand-text-secondary">
                                {activity.data.name || (activity.data as Submission).startupName}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {activity.date.toLocaleString()}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
      </div>
    </div>
  );
};

export default Overview;
