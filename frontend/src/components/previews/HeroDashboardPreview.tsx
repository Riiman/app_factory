import React, { FC } from 'react';
import {
    TrendingUp,
    Users,
    DollarSign,
    Activity,
    ArrowUpRight,
    MoreHorizontal
} from 'lucide-react';

const HeroDashboardPreview: FC = () => {
    return (
        <div className="w-full bg-slate-50 p-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Runway', value: '18 Months', trend: '+2mo', color: 'bg-emerald-50 text-emerald-600', icon: DollarSign },
                    { label: 'MRR Growth', value: '$250k', trend: '+12%', color: 'bg-blue-50 text-blue-600', icon: TrendingUp },
                    { label: 'Active Users', value: '12.5k', trend: '+8.4%', color: 'bg-purple-50 text-purple-600', icon: Users },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{stat.label}</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stat.color} flex items-center`}>
                                    {stat.trend} <ArrowUpRight className="w-3 h-3 ml-0.5" />
                                </span>
                            </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.color} bg-opacity-20`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-3 gap-6 h-64">
                <div className="col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-semibold text-slate-800">Revenue Forecast</h4>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-brand-500 mr-1" /> Actual</span>
                            <span className="flex items-center text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-slate-300 mr-1" /> Projected</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end justify-between px-2 gap-2">
                        {/* Fake Bars */}
                        {[40, 55, 45, 60, 75, 65, 80, 95, 85, 90, 100, 110].map((h, i) => (
                            <div key={i} className="w-full bg-slate-100 rounded-t-sm relative group">
                                <div
                                    className={`absolute bottom-0 left-0 right-0 rounded-t-sm ${i > 8 ? 'bg-slate-300 pattern-diagonal-lines-sm' : 'bg-brand-500'}`}
                                    style={{ height: `${h}%` }}
                                />
                                {/* Tooltip on hover */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    ${h * 2}.4k
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
                        <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span>
                    </div>
                </div>

                {/* Right Panel - AI Summary */}
                <div className="col-span-1 bg-gradient-to-b from-slate-900 to-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20">
                        <Activity className="w-24 h-24 text-brand-400" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                                <span className="text-[10px] font-bold">AI</span>
                            </div>
                            <h4 className="font-semibold text-sm">Copilot Insight</h4>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Based on current burn, you have <strong className="text-white">18 months</strong> of runway. Increasing marketing spend by 15% is recommended.
                                </p>
                            </div>

                            <div className="pt-2">
                                <button className="w-full py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-semibold transition-colors">
                                    View Recommendations
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroDashboardPreview;
