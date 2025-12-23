import React, { FC } from 'react';
import { Building2, Rocket, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

const ImplementationSection: FC = () => {
    return (
        <section className="py-24 bg-slate-50">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Implementation & Timelines</h2>
                    <p className="text-gray-600">Tailored paths for corporate innovation and startup acceleration.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Enterprise Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-300">
                        <div className="flex items-center space-x-3 mb-8">
                            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-brand-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Enterprises</h3>
                        </div>

                        <div className="space-y-8 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 -z-10" />

                            {[
                                { time: "2 weeks", label: "Intake, metrics, secure setup" },
                                { time: "Wks 3–6", label: "Prototyping sprints (1-3 pilots)" },
                                { time: "Wks 7–12", label: "Pilot validation & scale path", highlight: true }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start space-x-6 relative">
                                    <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 ${item.highlight ? 'bg-brand-600 text-white shadow-brand-200 shadow-lg' : 'bg-gray-200'}`}>
                                        {item.highlight ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-gray-500" />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">{item.time}</div>
                                        <div className="font-medium text-gray-900">{item.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 pt-8 border-t border-gray-100">
                            <button className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center">
                                Start a 90-day pilot <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    </div>

                    {/* Accelerator Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-300">
                        <div className="flex items-center space-x-3 mb-8">
                            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                                <Rocket className="w-5 h-5 text-accent-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Accelerators</h3>
                        </div>

                        <div className="space-y-8 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 -z-10" />

                            {[
                                { time: "T-2 wks", label: "Setup, mentor calendar" },
                                { time: "Wks 1–6", label: "Build + GTM sprints" },
                                { time: "Wks 7–8", label: "Traction shaping + Demo Day", highlight: true }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start space-x-6 relative">
                                    <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 ${item.highlight ? 'bg-accent-500 text-white shadow-accent-200 shadow-lg' : 'bg-gray-200'}`}>
                                        {item.highlight ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-gray-500" />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-accent-600 mb-1">{item.time}</div>
                                        <div className="font-medium text-gray-900">{item.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 pt-8 border-t border-gray-100">
                            <button className="w-full py-3 px-4 bg-brand-800 hover:bg-brand-900 text-white font-semibold rounded-lg transition-colors flex items-center justify-center">
                                Launch a 20-startup cohort <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ImplementationSection;
