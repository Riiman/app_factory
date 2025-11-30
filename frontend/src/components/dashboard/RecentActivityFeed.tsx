import React from 'react';
import { ActivityLog } from '../../types/dashboard-types';
import { Clock, CheckCircle, FileText, FlaskConical, AlertCircle } from 'lucide-react';

interface RecentActivityFeedProps {
    activities: ActivityLog[];
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activities }) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'Task': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'Experiment': return <FlaskConical className="h-4 w-4 text-purple-500" />;
            case 'Artifact': return <FileText className="h-4 w-4 text-blue-500" />;
            case 'Submission': return <AlertCircle className="h-4 w-4 text-orange-500" />;
            default: return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-4">
            {activities.length > 0 ? (
                activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white rounded-md border border-slate-100 shadow-sm">
                        <div className="mt-0.5">{getIcon(activity.target_type)}</div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-brand-text-primary">
                                <span className="capitalize">{activity.action}</span> <span className="font-bold">{activity.target_type}</span>
                            </p>
                            <p className="text-xs text-brand-text-secondary mt-0.5 truncate">{activity.details}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(activity.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
            )}
        </div>
    );
};

export default RecentActivityFeed;
