import React, { FC } from 'react';
import { ArrowUpRight, AlertCircle, CheckCircle } from 'lucide-react';

const IncubatorPortfolioPreview: FC = () => {
    const startups = [
        { name: 'Nebula', sector: 'AI/ML', revenue: '$1.2M', burn: '$85k', health: '92', status: 'Healthy', color: 'bg-emerald-500' },
        { name: 'FlowState', sector: 'SaaS', revenue: '$450k', burn: '$60k', health: '78', status: 'Stable', color: 'bg-blue-500' },
        { name: 'GreenGen', sector: 'CleanTech', revenue: '$0', burn: '$40k', health: '45', status: 'Risk', color: 'bg-orange-500' },
        { name: 'MedCore', sector: 'Health', revenue: '$2.1M', burn: '$150k', health: '88', status: 'Healthy', color: 'bg-emerald-500' },
    ];

    return (
        <div className="w-full bg-slate-900 p-6 font-sans text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Portfolio Overview</h3>
                <button className="bg-brand-600 hover:bg-brand-500 text-xs px-3 py-1.5 rounded-md transition-colors font-semibold">
                    Generate Report
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {startups.map((s, i) => (
                    <div key={i} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-sm">{s.name}</h4>
                                <span className="text-[10px] text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">{s.sector}</span>
                            </div>
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                                    <path className={s.status === 'Healthy' ? 'text-emerald-500' : s.status === 'Risk' ? 'text-orange-500' : 'text-blue-500'} strokeDasharray={`${s.health}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                                </svg>
                                <span className="absolute text-[8px] font-bold">{s.health}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500 block text-[9px]">ARR</span>
                                <span className="font-semibold">{s.revenue}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-[9px]">Burn</span>
                                <span className="font-semibold">{s.burn}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IncubatorPortfolioPreview;
