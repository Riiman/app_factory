import React, { FC } from 'react';
import { FileSpreadsheet, MessageSquare, BarChart2, Calendar, AlertCircle } from 'lucide-react';

const FragmentedToolsPreview: FC = () => {
    return (
        <div className="w-full h-full bg-slate-100 relative overflow-hidden flex items-center justify-center font-sans p-8">

            {/* Abstract Background Blobs to feel 'messy' */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-purple-200 rounded-full blur-2xl opacity-40 mix-blend-multiply" />
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-orange-200 rounded-full blur-2xl opacity-40 mix-blend-multiply" />

            {/* 1. The "Spreadsheet" (Excel/Sheets) - Left floating */}
            <div className="absolute left-4 top-8 w-48 bg-white rounded-lg shadow-lg border border-green-200 p-2 -rotate-6 z-10 opacity-90">
                <div className="flex items-center gap-2 mb-2 border-b border-green-50 pb-1">
                    <div className="bg-green-600 p-1 rounded">
                        <FileSpreadsheet className="w-3 h-3 text-white" />
                    </div>
                    <div className="h-2 w-20 bg-slate-100 rounded" />
                </div>
                <div className="space-y-1.5">
                    <div className="flex gap-1"><div className="w-8 h-2 bg-slate-100" /><div className="w-12 h-2 bg-slate-100" /><div className="w-8 h-2 bg-slate-100" /></div>
                    <div className="flex gap-1"><div className="w-8 h-2 bg-slate-100" /><div className="w-12 h-2 bg-slate-100" /><div className="w-8 h-2 bg-slate-100" /></div>
                    <div className="flex gap-1"><div className="w-8 h-2 bg-slate-100" /><div className="w-12 h-2 bg-slate-100" /><div className="w-8 h-2 bg-red-100" /></div>
                    <div className="flex gap-1"><div className="w-8 h-2 bg-slate-100" /><div className="w-12 h-2 bg-slate-100" /><div className="w-8 h-2 bg-slate-100" /></div>
                </div>
            </div>

            {/* 2. The "Chat" (Slack/Teams) - Right floating */}
            <div className="absolute right-6 top-16 w-44 bg-white rounded-lg shadow-lg border border-slate-200 p-3 rotate-3 z-20">
                <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3 h-3 text-purple-500" />
                    <span className="text-[8px] font-bold text-slate-500">Team Chat</span>
                </div>
                <div className="flex gap-2 items-start">
                    <div className="w-5 h-5 rounded bg-purple-100 flex-shrink-0" />
                    <div className="bg-slate-50 p-1.5 rounded-tr-lg rounded-b-lg text-[8px] text-slate-600 leading-tight">
                        Where is the updated deck? Client is asking.
                    </div>
                </div>
                <div className="flex gap-2 items-start mt-2 flex-row-reverse">
                    <div className="w-5 h-5 rounded bg-blue-100 flex-shrink-0" />
                    <div className="bg-blue-50 p-1.5 rounded-tl-lg rounded-b-lg text-[8px] text-blue-700 leading-tight">
                        Check the spreadsheet... or maybe Drive?
                    </div>
                </div>
            </div>

            {/* 3. The "Tasks" (Jira/Trello) - Bottom Center */}
            <div className="absolute bottom-6 left-12 w-48 bg-white rounded-lg shadow-xl border border-blue-200 p-2 -rotate-2 z-30">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-bold text-blue-600 uppercase">Backlog</span>
                    <div className="flex gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    </div>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100 mb-1">
                    <div className="w-3/4 h-1.5 bg-slate-200 rounded mb-1" />
                    <div className="w-1/2 h-1.5 bg-slate-200 rounded" />
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100 mb-1">
                    <div className="w-5/6 h-1.5 bg-slate-200 rounded mb-1" />
                    <div className="w-1/3 h-1.5 bg-red-200 rounded" />
                </div>
            </div>

            {/* 4. The "Analytics" (Tableau/Looker) - Faded in background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-32 bg-white rounded-lg shadow-sm border border-slate-100 p-2 z-0 opacity-70 scale-90">
                <div className="flex items-center gap-1 mb-2">
                    <BarChart2 className="w-3 h-3 text-slate-400" />
                    <div className="w-16 h-1 bg-slate-100 rounded" />
                </div>
                <div className="flex items-end gap-1 h-16 justify-center">
                    <div className="w-3 bg-slate-100 h-8" />
                    <div className="w-3 bg-slate-100 h-12" />
                    <div className="w-3 bg-slate-100 h-6" />
                    <div className="w-3 bg-slate-100 h-10" />
                    <div className="w-3 bg-slate-100 h-4" />
                </div>
            </div>

            {/* Red "Disconnect" Icons */}
            <div className="absolute top-1/3 left-1/3 z-40 bg-white rounded-full p-1 shadow-md">
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
            <div className="absolute bottom-1/3 right-1/3 z-40 bg-white rounded-full p-1 shadow-md">
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            </div>

        </div>
    );
};

export default FragmentedToolsPreview;
