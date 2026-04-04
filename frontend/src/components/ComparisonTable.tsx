import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const ComparisonTable: FC = () => {
    const data = [
        { feature: "Scope", others: "Insights per module", ours: "Intelligence across the company" },
        { feature: "Visualization", others: "Multiple dashboards", ours: "One command center" },
        { feature: "Intelligence", others: "AI per workspace", ours: "Context-aware AI" },
        { feature: "Architecture", others: "Siloed execution", ours: "Shared system of truth" },
        { feature: "Outcome", others: "Manual synthesis", ours: "Automated understanding" }
    ];

    return (
        <section className="py-24 bg-slate-50">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                        Why This Matters
                    </h2>
                    <p className="text-xl text-slate-600">
                        VentureStack doesn’t just show you data — it understands it.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    <div className="grid grid-cols-3 bg-slate-50 p-6 border-b border-slate-200 font-semibold text-slate-700">
                        <div className="text-sm uppercase tracking-wider text-slate-500">Feature</div>
                        <div className="text-center text-slate-500">Other Platforms</div>
                        <div className="text-center text-brand-600 font-bold text-lg">VentureStack</div>
                    </div>

                    {data.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-3 p-6 border-b last:border-0 border-slate-100 items-center hover:bg-slate-50 transition-colors">
                            <div className="font-medium text-slate-900">{row.feature}</div>
                            <div className="text-center text-slate-500 flex flex-col items-center justify-center">
                                <span className="opacity-50 line-through decoration-red-400 decoration-2">{row.others}</span>
                            </div>
                            <div className="text-center text-brand-700 font-semibold bg-brand-50/50 py-2 rounded-lg border border-brand-100/50">
                                {row.ours}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ComparisonTable;
