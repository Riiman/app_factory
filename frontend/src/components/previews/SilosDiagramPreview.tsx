import React, { FC } from 'react';
import { Database, Lock, Ban, FileText, BarChart3, PieChart } from 'lucide-react';

const SilosDiagramPreview: FC = () => {
    return (
        <div className="w-full h-full bg-slate-50 p-6 flex flex-col items-center justify-center font-sans">
            <div className="flex items-center justify-center gap-4 w-full max-w-lg">

                {/* Silo 1: Product */}
                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center min-h-[160px] relative">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                        <Database className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Product</h4>
                    <div className="w-full space-y-1.5 opacity-60">
                        <div className="h-1.5 w-3/4 bg-slate-200 rounded-full" />
                        <div className="h-1.5 w-1/2 bg-slate-200 rounded-full" />
                        <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                    </div>
                    {/* Lock Icon Overlay */}
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white p-1 rounded-full border border-slate-100 shadow-sm text-slate-400">
                        <Lock className="w-3 h-3" />
                    </div>
                </div>

                {/* Separator / Break */}
                <div className="text-slate-300 flex flex-col items-center gap-1">
                    <div className="h-8 border-l border-dashed border-slate-300" />
                    <Ban className="w-4 h-4 text-red-300" />
                    <div className="h-8 border-l border-dashed border-slate-300" />
                </div>

                {/* Silo 2: Marketing */}
                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center min-h-[160px] relative">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Growth</h4>
                    <div className="w-full space-y-2 opacity-60 flex items-end justify-center gap-1 h-8">
                        <div className="w-2 h-4 bg-purple-200 rounded-sm" />
                        <div className="w-2 h-6 bg-purple-200 rounded-sm" />
                        <div className="w-2 h-3 bg-purple-200 rounded-sm" />
                        <div className="w-2 h-8 bg-purple-200 rounded-sm" />
                    </div>
                    {/* Lock Icon Overlay */}
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white p-1 rounded-full border border-slate-100 shadow-sm text-slate-400">
                        <Lock className="w-3 h-3" />
                    </div>
                </div>

                {/* Separator / Break */}
                <div className="text-slate-300 flex flex-col items-center gap-1">
                    <div className="h-8 border-l border-dashed border-slate-300" />
                    <Ban className="w-4 h-4 text-red-300" />
                    <div className="h-8 border-l border-dashed border-slate-300" />
                </div>

                {/* Silo 3: Finance */}
                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center min-h-[160px]">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                        <PieChart className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Finance</h4>
                    <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 opacity-60" />
                </div>

            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <Ban className="w-3 h-3 text-red-500" />
                <span>Data does not flow between teams</span>
            </div>
        </div>
    );
};

export default SilosDiagramPreview;
