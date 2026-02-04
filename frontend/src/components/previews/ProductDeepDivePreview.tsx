import React, { FC } from 'react';
import { MoreHorizontal, Plus, User } from 'lucide-react';

const ProductDeepDivePreview: FC = () => {
    const columns = [
        { title: 'To Do', color: 'bg-slate-100', items: [{ title: 'Mobile App Auth', tag: 'Backend' }, { title: 'User Profile Settings', tag: 'Frontend' }] },
        { title: 'In Progress', color: 'bg-blue-50', items: [{ title: 'Stripe Integration', tag: 'High Prio' }] },
        { title: 'Done', color: 'bg-emerald-50', items: [{ title: 'Landing Page v2', tag: 'Growth' }] }
    ];

    return (
        <div className="w-full bg-white p-4 font-sans h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <div className="h-8 w-8 bg-brand-600 rounded-md flex items-center justify-center text-white font-bold">P</div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Product Roadmap</h3>
                        <p className="text-[10px] text-slate-400">Q3 Sprint 4</p>
                    </div>
                </div>
                <button className="bg-brand-600 text-white p-1.5 rounded-md">
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex gap-3 overflow-hidden flex-1">
                {columns.map((col, i) => (
                    <div key={i} className={`flex-1 rounded-lg p-2 ${col.color} flex flex-col gap-2`}>
                        <div className="flex justify-between items-center mb-1 px-1">
                            <h4 className="font-semibold text-slate-600 text-[10px] uppercase tracking-wider">{col.title}</h4>
                            <MoreHorizontal className="w-3 h-3 text-slate-400" />
                        </div>
                        {col.items.map((item, j) => (
                            <div key={j} className="bg-white p-2.5 rounded border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow cursor-default">
                                <div className="flex flex-wrap gap-1 mb-2">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded full ${item.tag === 'High Prio' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {item.tag}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-800 mb-2 leading-snug">{item.title}</p>
                                <div className="flex justify-between items-center">
                                    <div className="flex -space-x-1">
                                        <div className="w-4 h-4 rounded-full bg-slate-300 border border-white" />
                                    </div>
                                    <div className="text-[9px] text-slate-400">Sep 24</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductDeepDivePreview;
