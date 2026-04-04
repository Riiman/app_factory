import React, { FC } from 'react';

const GrowthSalesPreview: FC = () => {
    return (
        <div className="w-full bg-white p-5 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Funnel Chart */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wide">Conversion Funnel</h4>
                    <div className="space-y-3">
                        {[
                            { label: 'Visitors', val: '12,500', width: '100%', color: 'bg-blue-100' },
                            { label: 'Leads', val: '1,200', width: '65%', color: 'bg-blue-300' },
                            { label: 'Qualified', val: '450', width: '40%', color: 'bg-blue-500' },
                            { label: 'Customers', val: '85', width: '20%', color: 'bg-brand-600' }
                        ].map((step, i) => (
                            <div key={i} className="relative h-8 rounded group flex items-center px-2">
                                <div className={`absolute left-0 top-0 bottom-0 rounded ${step.color}`} style={{ width: step.width }} />
                                <div className="relative z-10 w-full flex justify-between text-xs font-semibold text-slate-700 group-hover:text-black">
                                    <span>{step.label}</span>
                                    <span>{step.val}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pipeline Table */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                    <h4 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wide">Recent Deals</h4>
                    <div className="flex-1 overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="font-semibold text-slate-500 pb-2">Client</th>
                                    <th className="font-semibold text-slate-500 pb-2 text-right">Value</th>
                                    <th className="font-semibold text-slate-500 pb-2 text-right">Stage</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {[
                                    { client: 'Acme Corp', val: '$12k', stage: 'Closing', color: 'text-orange-600 bg-orange-50' },
                                    { client: 'Stark Ind', val: '$45k', stage: 'Won', color: 'text-emerald-600 bg-emerald-50' },
                                    { client: 'Globex', val: '$8k', stage: 'Negotiation', color: 'text-blue-600 bg-blue-50' },
                                    { client: 'Soylent', val: '$22k', stage: 'Proposal', color: 'text-slate-600 bg-slate-100' },
                                ].map((row, i) => (
                                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                        <td className="py-2.5 font-medium">{row.client}</td>
                                        <td className="py-2.5 text-right">{row.val}</td>
                                        <td className="py-2.5 text-right">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.color}`}>
                                                {row.stage}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrowthSalesPreview;
