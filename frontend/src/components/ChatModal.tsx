import React, { useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, X, MessageSquare } from 'lucide-react';

interface PlanStep {
    id: number;
    description: string;
    action: string;
    command?: string;
    file_path?: string;
    content?: string;
}

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    plan: PlanStep[];
    progress: { completed: number; total: number };
    waitingApproval: boolean;
    currentStep: PlanStep | null;
    prompt: string;
    setPrompt: (s: string) => void;
    runTask: () => void;
    approveStep: () => void;
    rejectStep: () => void;
    isWorking: boolean;
    isRunning: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({
    isOpen, onClose, logs, plan, progress, waitingApproval, currentStep,
    prompt, setPrompt, runTask, approveStep, rejectStep, isWorking, isRunning
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm">
            <div className="bg-gray-900 w-full h-full max-w-5xl rounded-lg border border-gray-700 flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-14 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 shrink-0">
                    <div className="flex items-center gap-2 text-gray-200 font-semibold">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                        <span>Agent Chat</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Plan & Progress */}
                    <div className="w-1/3 border-r border-gray-800 bg-gray-900/50 p-4 overflow-y-auto">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Execution Plan</h3>

                        {progress.total > 0 && (
                            <div className="mb-6 bg-gray-800 p-3 rounded border border-gray-700">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1 text-right">
                                    {progress.completed} / {progress.total} Tasks
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {plan.map((step, idx) => (
                                <div key={idx} className="bg-gray-800 rounded p-3 border border-gray-700 flex items-start gap-3">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-sm text-gray-200">Step {step.id}</span>
                                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 uppercase">{step.action}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                            {plan.length === 0 && <div className="text-gray-500 text-sm italic">No active plan.</div>}
                        </div>
                    </div>

                    {/* Right: Chat & Logs */}
                    <div className="flex-1 flex flex-col bg-black">
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
                            {logs.map((log, i) => {
                                let color = "text-gray-300";
                                if (log.includes("Architect:")) color = "text-purple-400";
                                if (log.includes("Planner:")) color = "text-blue-400";
                                if (log.includes("Developer:")) color = "text-green-400";
                                if (log.includes("Reviewer:")) color = "text-orange-400";
                                if (log.includes("Executor:")) color = "text-yellow-400";
                                if (log.includes("Strategist:")) color = "text-red-400";
                                return <div key={i} className={`break-all ${color}`}>{log}</div>
                            })}
                            <div ref={logsEndRef} />
                        </div>

                        {/* Approval Box */}
                        {waitingApproval && (
                            <div className="bg-yellow-900/20 border-t border-yellow-700 p-4 animate-pulse">
                                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-semibold">Approval Required</span>
                                </div>
                                <p className="text-sm text-gray-300 mb-3">
                                    The Developer wants to execute:
                                    <br />
                                    <code className="text-green-400">{currentStep?.command || currentStep?.description}</code>
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={approveStep} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-medium">Approve</button>
                                    <button onClick={rejectStep} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded text-sm font-medium">Reject</button>
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-800 bg-gray-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                                    placeholder="Assign a task to the agent..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    disabled={!isRunning || isWorking}
                                    onKeyDown={(e) => e.key === 'Enter' && runTask()}
                                />
                                <button
                                    onClick={runTask}
                                    disabled={!isRunning || isWorking || !prompt}
                                    className="bg-blue-600 hover:bg-blue-700 px-6 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isWorking && !waitingApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
