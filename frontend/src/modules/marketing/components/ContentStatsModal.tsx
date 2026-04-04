
import React, { useState } from 'react';
import { X, RefreshCw, BarChart2, TrendingUp, Users, MousePointer, Activity } from 'lucide-react';
import { MarketingContentItem } from '@/types/dashboard-types';
import Card from '@/components/Card';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface ContentStatsModalProps {
    item: MarketingContentItem;
    onClose: () => void;
    startupId: number;
    onRefresh?: () => void;
}

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
    <div className={`p-4 rounded-xl border ${color} bg-white shadow-sm flex items-center space-x-4`}>
        <div className={`p-3 rounded-full ${color.replace('border-', 'bg-').replace('-200', '-50')} ${color.replace('border-', 'text-').replace('-200', '-600')}`}>
            <Icon size={20} />
        </div>
        <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const ContentStatsModal: React.FC<ContentStatsModalProps> = ({ item, onClose, startupId, onRefresh }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await api.request('POST', `/startups/${startupId}/content-items/${item.content_id}/refresh-metrics`, {});
            toast.success('Metrics updated');
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            toast.error('Failed to refresh metrics');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Helper to pick icon based on key
    const getIconForKey = (key: string) => {
        const k = key.toLowerCase();
        if (k.includes('impression') || k.includes('view')) return Users;
        if (k.includes('click')) return MousePointer;
        if (k.includes('engagement') || k.includes('like')) return Activity;
        if (k.includes('conversion') || k.includes('ctr')) return TrendingUp;
        return BarChart2;
    };

    // Helper to pick color based on key
    const getColorForKey = (index: number) => {
        const colors = [
            'border-blue-200',
            'border-green-200',
            'border-purple-200',
            'border-orange-200',
            'border-pink-200',
            'border-indigo-200'
        ];
        return colors[index % colors.length];
    };

    const metrics = item.performance || {};
    const metricKeys = Object.keys(metrics);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="text-brand-primary" size={20} />
                        <h2 className="text-lg font-bold text-gray-900 line-clamp-1">{item.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-sm text-gray-500">Published on {new Date(item.publish_date).toLocaleDateString()}</p>
                            <p className="text-xs font-medium text-gray-400 mt-1 uppercase">{item.channel} • {item.content_type}</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isRefreshing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
                        >
                            <RefreshCw size={14} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Syncing...' : 'Sync Data'}
                        </button>
                    </div>

                    {metricKeys.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {metricKeys.map((key, index) => (
                                <StatCard
                                    key={key}
                                    label={key.replace(/_/g, ' ')}
                                    value={typeof metrics[key] === 'number' ? metrics[key].toLocaleString() : metrics[key]}
                                    icon={getIconForKey(key)}
                                    color={getColorForKey(index)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <BarChart2 className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-gray-500 font-medium">No performance data available yet.</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Sync Data" to fetch the latest metrics.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentStatsModal;
