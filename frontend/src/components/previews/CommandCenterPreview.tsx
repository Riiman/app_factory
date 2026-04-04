import React, { FC } from 'react';
import { Activity, AlertCircle, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';

const CommandCenterPreview: FC = () => {
    return (
        <div className="w-full bg-slate-50 p-4 font-sans text-xs">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 text-sm">Company Health</h3>
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">Last 30 Days</span>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 font-medium">Runway</span>
                        <DollarSign className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">18 Mo</div>
                    <div className="text-[10px] text-emerald-600 font-medium mt-1">+2 Mo vs Plan</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 font-medium">Burn</span>
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">$125k</div>
                    <div className="text-[10px] text-red-500 font-medium mt-1">Over Budget</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 font-medium">NPS</span>
                        <Activity className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">72</div>
                    <div className="text-[10px] text-emerald-600 font-medium mt-1">Excellent</div>
                </div>
            </div>

            {/* Strategic Initiatives List */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-semibold text-slate-700">
                    Strategic Initiatives
                </div>
                <div>
                    {[
                        { name: 'Series B Preparation', status: 'On Track', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
                        { name: 'Enterprise Market Expansion', status: 'At Risk', color: 'text-red-600 bg-red-50', icon: AlertCircle },
                        { name: 'Q3 Product Launch', status: 'On Track', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                                <span className="font-medium text-slate-700">{item.name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.color}`}>
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommandCenterPreview;
