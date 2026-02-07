import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product, Sprint, Release } from '@/types/dashboard-types';
import api from '@/utils/api';
import Card from '@/components/Card';
import { ChevronRight, Calendar, Flag } from 'lucide-react';

interface RoadmapViewProps {
    product: Product;
}

const RoadmapView: React.FC<RoadmapViewProps> = ({ product }) => {
    // Fetch Data
    const { data: sprints = [], isLoading: loadingSprints } = useQuery({
        queryKey: ['sprints', product.id],
        queryFn: () => api.getSprints(product.id)
    });

    const { data: releases = [], isLoading: loadingReleases } = useQuery({
        queryKey: ['releases', product.id],
        queryFn: () => api.getReleases(product.id)
    });

    // Calculations
    const { minDate, maxDate, totalDays } = useMemo(() => {
        const dates: number[] = [
            Date.now(),
            Date.now() + 30 * 24 * 60 * 60 * 1000 // Ensure at least 30 days window
        ];

        sprints.forEach((s: any) => {
            if (s.start_date) dates.push(new Date(s.start_date).getTime());
            if (s.end_date) dates.push(new Date(s.end_date).getTime());
        });
        releases.forEach((r: any) => {
            if (r.target_date) dates.push(new Date(r.target_date).getTime());
        });

        const min = Math.min(...dates);
        const max = Math.max(...dates);
        // Add buffer
        const bufferMin = min - 7 * 24 * 60 * 60 * 1000;
        const bufferMax = max + 14 * 24 * 60 * 60 * 1000;

        return {
            minDate: bufferMin,
            maxDate: bufferMax,
            totalDays: (bufferMax - bufferMin) / (1000 * 60 * 60 * 24)
        };
    }, [sprints, releases]);

    const getPosition = (dateStr: string) => {
        if (!dateStr) return 0;
        const date = new Date(dateStr).getTime();
        const percent = ((date - minDate) / (maxDate - minDate)) * 100;
        return Math.max(0, Math.min(100, percent));
    };

    const getWidth = (startStr: string, endStr: string) => {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr).getTime();
        const end = new Date(endStr).getTime();
        const percent = ((end - start) / (maxDate - minDate)) * 100;
        return Math.max(0.5, percent); // Minimum 0.5% width
    };

    const generateTimeMarkers = () => {
        const markers = [];
        let current = new Date(minDate);
        const end = new Date(maxDate);

        while (current < end) {
            markers.push(new Date(current));
            // Increment by month for markers, maybe different for specific grid
            current.setMonth(current.getMonth() + 1);
            current.setDate(1); // Align to 1st of month
        }
        return markers;
    };

    if (loadingSprints || loadingReleases) return <div>Loading roadmap...</div>;

    const timeMarkers = generateTimeMarkers();

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header / Controls */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2">
                    <Calendar size={18} className="text-gray-500" />
                    <span className="font-semibold text-gray-700">Timeline</span>
                </div>
                <div className="text-xs text-gray-500">
                    {new Date(minDate).toLocaleDateString()} - {new Date(maxDate).toLocaleDateString()}
                </div>
            </div>

            {/* Timeline Container */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 overflow-x-auto relative min-h-[400px]">
                <div className="min-w-[1000px] h-full relative p-4 pt-10">

                    {/* Time Axis (Grid Background) */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                        {timeMarkers.map((date, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-gray-100/80 text-xs text-gray-400 pl-1 pt-2"
                                style={{ left: `${getPosition(date.toISOString())}%` }}
                            >
                                {date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </div>
                        ))}
                    </div>

                    {/* Today Line */}
                    <div
                        className="absolute top-0 bottom-0 border-l-2 border-red-400/50 z-10"
                        style={{ left: `${getPosition(new Date().toISOString())}%` }}
                    >
                        <span className="text-[10px] text-red-500 font-bold bg-white/80 absolute top-0 -translate-x-1/2 px-1 rounded">TODAY</span>
                    </div>

                    {/* Swimlanes */}
                    <div className="space-y-8 relative z-0 mt-6">

                        {/* Releases Lane */}
                        <div className="relative h-20">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 sticky left-0 bg-white/90 inline-block px-2 backdrop-blur-sm rounded">Releases</h4>
                            {releases.map((release: any) => (
                                <div
                                    key={release.id}
                                    className="absolute top-6 group cursor-pointer"
                                    style={{ left: `${getPosition(release.target_date)}%` }}
                                    title={release.description}
                                >
                                    <div className="flex flex-col items-center -translate-x-1/2">
                                        <div className="w-0.5 h-4 bg-purple-300 mb-0.5"></div>
                                        <Flag size={16} className={`text-purple-600 ${release.status === 'SHIPPED' ? 'fill-purple-600' : ''}`} />
                                        <span className="text-xs font-bold text-gray-800 bg-white/80 px-1 rounded shadow-sm whitespace-nowrap mt-1 border border-gray-100">
                                            {release.version}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sprints Lane */}
                        <div className="relative">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 sticky left-0 bg-white/90 inline-block px-2 backdrop-blur-sm rounded">Sprints</h4>
                            <div className="relative h-12 bg-gray-50/50 rounded-lg w-full">
                                {sprints.map((sprint: any) => (
                                    <div
                                        key={sprint.id}
                                        className={`absolute top-1 h-10 rounded-md border text-xs flex flex-col justify-center px-2 shadow-sm overflow-hidden whitespace-nowrap transition-all hover:z-20 hover:shadow-md cursor-pointer ${sprint.status === 'ACTIVE' ? 'bg-green-100 border-green-300 text-green-900 z-10' :
                                                sprint.status === 'COMPLETED' ? 'bg-gray-100 border-gray-300 text-gray-500 opacity-80' :
                                                    'bg-blue-50 border-blue-200 text-blue-800'
                                            }`}
                                        style={{
                                            left: `${getPosition(sprint.start_date)}%`,
                                            width: `${getWidth(sprint.start_date, sprint.end_date)}%`
                                        }}
                                        title={`${sprint.name}\nGoal: ${sprint.goal || 'None'}`}
                                    >
                                        <div className="font-bold truncate">{sprint.name}</div>
                                        <div className="text-[10px] opacity-80 truncate">{sprint.goal}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default RoadmapView;
