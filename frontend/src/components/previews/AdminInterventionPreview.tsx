import React, { FC } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, UserPlus, FileText, MessageSquare } from 'lucide-react';

const AdminInterventionPreview: FC = () => {
    return (
        <div className="w-full h-full bg-slate-50 p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">Active Interventions</h3>
                    <p className="text-[10px] text-slate-500">3 High Priority Actions</p>
                </div>
                <button className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-semibold shadow-sm">
                    Filter
                </button>
            </div>

            <div className="space-y-3">
                {/* Alert Card 1 */}
                <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex gap-4 relative overflow-hidden group hover:border-red-200 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-800 text-xs">Burn Rate Warning: Nebula AI</h4>
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URGENT</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-3">Runway dropped below 3 months. Verify financial milestones.</p>

                        <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 px-2 py-1 bg-red-600 text-white text-[10px] rounded font-semibold hover:bg-red-700">
                                <UserPlus className="w-3 h-3" /> Assign CFO Mentor
                            </button>
                            <button className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded font-semibold hover:bg-slate-200">
                                <MessageSquare className="w-3 h-3" /> Message Founder
                            </button>
                        </div>
                    </div>
                </div>

                {/* Alert Card 2 */}
                <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex gap-4 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-800 text-xs">Missing Q3 Updates</h4>
                            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">PENDING</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">5 companies haven't submitted investor updates.</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex -space-x-2">
                                <div className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
                                <div className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
                                <div className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
                            </div>
                            <span className="text-[9px] text-brand-600 font-semibold cursor-pointer">Remind All</span>
                        </div>
                    </div>
                </div>

                {/* Success Card 3 */}
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex gap-4 relative overflow-hidden opacity-80">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-800 text-xs">Series A Closed: FlowState</h4>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">DONE</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Updated valuation and cap table.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminInterventionPreview;
