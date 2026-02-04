import React, { FC } from 'react';
import { Send, Sparkles, User, AlertTriangle } from 'lucide-react';

const AICopilotPreview: FC = () => {
    return (
        <div className="w-full h-full bg-slate-50 relative flex items-center justify-center p-6 bg-[url('https://placehold.co/800x600/f1f5f9/f1f5f9')] bg-cover">
            {/* Blurred background context hint */}
            <div className="absolute inset-0 opacity-5 backdrop-blur-sm bg-slate-200 pointer-events-none" />

            {/* Chat Interface */}
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10 font-sans">
                {/* Header */}
                <div className="bg-slate-900 text-white p-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-400 to-accent-400 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-semibold text-sm">VentureStack Copilot</span>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-4 bg-slate-50 min-h-[200px]">
                    {/* User Message */}
                    <div className="flex gap-3 flex-row-reverse">
                        <div className="w-6 h-6 rounded-full bg-slate-300 flex-shrink-0 flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-brand-600 text-white text-xs py-2 px-3 rounded-2xl rounded-tr-none shadow-sm">
                            What are the risks to our Q3 goals?
                        </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-brand-400" />
                        </div>
                        <div className="bg-white border border-slate-200 text-slate-700 text-xs py-3 px-3 rounded-2xl rounded-tl-none shadow-sm w-full">
                            <p className="mb-2">Based on current velocity, there are <strong className="text-slate-900">2 critical risks</strong>:</p>

                            <div className="bg-red-50 border border-red-100 rounded-lg p-2 mb-2 flex gap-2 items-start">
                                <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5" />
                                <div>
                                    <span className="block font-bold text-red-700 text-[10px]">Supply Chain Delay</span>
                                    <span className="text-[9px] text-red-600">Hardware shipment delayed by 14 days.</span>
                                </div>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex gap-2 items-start">
                                <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5" />
                                <div>
                                    <span className="block font-bold text-orange-700 text-[10px]">Budget Deviation</span>
                                    <span className="text-[9px] text-orange-600">Marketing spend is 20% over tracking.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <div className="flex-1 bg-slate-100 text-slate-400 text-xs py-2 px-3 rounded-full">
                        Ask anything about your company...
                    </div>
                    <button className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white hover:bg-brand-700">
                        <Send className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AICopilotPreview;
