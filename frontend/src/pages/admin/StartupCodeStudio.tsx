import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Terminal as TerminalIcon, Send, Loader2, CheckCircle, AlertCircle, Users, ExternalLink, RefreshCw, X, Folder, FileText, MessageSquare, ChevronRight, ChevronDown, Bug, Box } from 'lucide-react';
import TerminalComponent from '../../components/TerminalComponent';
import FileExplorer from '../../components/FileExplorer';
import ChatModal from '../../components/ChatModal';
import api from '../../utils/api';

interface PlanStep {
    id: number;
    description: string;
    action: string;
    command?: string;
    file_path?: string;
    content?: string;
}

const StartupCodeStudio: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [plan, setPlan] = useState<PlanStep[]>([]);
    const [isWorking, setIsWorking] = useState(false);
    const [ports, setPorts] = useState<any>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // New State for Refactor
    const [showChatModal, setShowChatModal] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [issues, setIssues] = useState<any[]>([]);
    const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg} `]);

    const handleStart = async () => {
        addLog('Starting environment...');
        try {
            const res = await fetch(`/api/builder/${id}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stack_type: 'MERN' })
            });
            let data;
            try {
                data = await res.json();
            } catch (e) {
                addLog(`Error parsing response: ${res.status} ${res.statusText}`);
                return;
            }
            if (data.status === 'running' || data.status === 'created') {
                setIsRunning(true);
                setPorts(data.ports);
                addLog(`Environment started. Container ID: ${data.container_id}`);
            } else if (data.status === 'building') {
                addLog(`Environment is building... this may take a few minutes. (${data.message})`);
                setTimeout(handleStart, 5000);
            } else {
                addLog(`Error starting: ${JSON.stringify(data)}`);
            }
        } catch (e) {
            addLog(`Error: ${e}`);
        }
    };

    const handleStop = async () => {
        addLog('Stopping environment...');
        try {
            const res = await fetch(`/api/builder/${id}/stop`, { method: 'POST' });
            const data = await res.json();
            setIsRunning(false);
            setPorts(null);
            addLog(`Environment stopped: ${data.status}`);
        } catch (e) {
            addLog(`Error: ${e}`);
        }
    };

    const [yoloMode, setYoloMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'issues' | 'files'>('projects');
    const [showTerminal, setShowTerminal] = useState(false);
    const [showContainerLogs, setShowContainerLogs] = useState(false);
    const [containerLogs, setContainerLogs] = useState('');
    const [waitingApproval, setWaitingApproval] = useState(false);
    const [currentStep, setCurrentStep] = useState<PlanStep | null>(null);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    // Polling for logs and progress
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isWorking && !waitingApproval) {
            interval = setInterval(fetchLogs, 2000);
        }
        return () => clearInterval(interval);
    }, [isWorking, waitingApproval]);

    const fetchData = async () => {
        try {
            // Fetch Products (which include features)
            // We might need a new endpoint or reuse existing.
            // Assuming /api/startups/{id} returns full object including products.
            // Or we can use the existing /features endpoint if it returns hierarchy.
            // Let's try to fetch full startup data for now.
            const res = await api.get(`/startups/${id}`);
            const startup = res.data;
            if (startup.products) {
                setProducts(startup.products);
                // Extract issues from products
                const allIssues = startup.products.flatMap((p: any) =>
                    (p.product_issues || []).map((i: any) => ({ ...i, product_name: p.name }))
                );
                setIssues(allIssues);
            }
        } catch (e) {
            console.error("Error fetching data:", e);
        }
    };

    const triggerAgent = async (taskPrompt: string) => {
        setPrompt(taskPrompt);
        setShowChatModal(true);
        // We need to wait for state update or pass directly.
        // runTask uses 'prompt' state.
        // We can call runTaskInternal directly.
        setIsWorking(true);
        setWaitingApproval(false);
        setPlan([]);
        setLogs([]);
        setProgress({ completed: 0, total: 0 });
        addLog(`Auto-Triggered Task: "${taskPrompt}" (YOLO: ${yoloMode})`);
        await runTaskInternal(taskPrompt, yoloMode);
    };

    const initProduct = (product: any) => {
        const p = `Initialize project structure for product "${product.name}".
Description: ${product.description}
Tech Stack: ${JSON.stringify(product.tech_stack || [])}

Create the necessary folders, package.json/requirements.txt, and a basic README.md.
Do not implement features yet.`;
        triggerAgent(p);
    };

    const buildFeature = (feature: any, productName: string) => {
        const p = `Implement feature "${feature.name}" for product "${productName}".
Description: ${feature.description}
Acceptance Criteria: ${feature.acceptance_criteria || 'N/A'}`;
        triggerAgent(p);
    };

    const fixIssue = (issue: any) => {
        const p = `Fix issue "${issue.title}" in product "${issue.product_name}".
Description: ${issue.description}
Severity: ${issue.severity}`;
        triggerAgent(p);
    };

    const runTaskInternal = async (goal: string, yolo: boolean) => {
        try {
            const res = await fetch(`/api/builder/${id}/run-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, yolo })
            });
            const data = await res.json();
            handleResponse(data);
        } catch (e) {
            addLog(`Error: ${e}`);
        }
    };

    const runTask = async () => {
        if (!prompt) return;
        setIsWorking(true);
        setWaitingApproval(false);
        setPlan([]);
        setLogs([]);
        setProgress({ completed: 0, total: 0 });
        addLog(`Team assigned to task: "${prompt}" (YOLO: ${yoloMode})`);
        await runTaskInternal(prompt, yoloMode);
    };

    const approveStep = async () => {
        setWaitingApproval(false);
        addLog("Step approved. Resuming...");
        setIsWorking(true);

        try {
            const res = await fetch(`/api/builder/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ yolo: yoloMode })
            });
            const data = await res.json();
            handleResponse(data);
        } catch (e) {
            addLog(`Error: ${e}`);
            setIsWorking(false);
        }
    };

    const rejectStep = () => {
        setIsWorking(false);
        setWaitingApproval(false);
        addLog("Task rejected by user.");
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/builder/${id}/logs`);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.logs) setLogs(data.logs);
                if (data.total_tasks) {
                    setProgress({
                        completed: data.completed_tasks || 0,
                        total: data.total_tasks
                    });
                }
                if (data.task_status === 'failed') {
                    addLog("Task failed (fetched from history).");
                    setIsWorking(false);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchContainerLogs = async () => {
        try {
            const res = await fetch(`/api/builder/${id}/container-logs`);
            const data = await res.json();
            if (data.logs) {
                setContainerLogs(data.logs);
                setShowContainerLogs(true);
            } else {
                alert("No logs found or container not running.");
            }
        } catch (e) {
            console.error(e);
            alert("Error fetching logs.");
        }
    };

    const handleResponse = (data: any) => {
        if (data.status === 'success') {
            if (data.logs) setLogs(data.logs);
            if (data.plan) setPlan(data.plan);

            if (data.total_tasks) {
                setProgress({
                    completed: data.completed_tasks || 0,
                    total: data.total_tasks
                });
            }

            if (data.waiting_approval) {
                setWaitingApproval(true);
                setCurrentStep(data.current_step);
                addLog("System paused. Waiting for approval.");
                setShowChatModal(true); // Auto-open modal for approval
            } else if (data.task_status === 'failed') {
                addLog('Task failed. Check logs for details.');
                setIsWorking(false);
            } else {
                addLog('Task completed successfully.');
                setIsWorking(false);
                fetchData(); // Refresh features/issues status
            }
        } else {
            addLog(`Task failed: ${data.error}`);
            setIsWorking(false);
        }
    };

    const toggleProduct = (pid: number) => {
        setExpandedProducts(prev => ({ ...prev, [pid]: !prev[pid] }));
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
            {/* Header */}
            <div className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-950">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="mr-4 hover:bg-gray-800 p-1 rounded">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-semibold text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Startup Code Studio <span className="text-gray-500 text-sm ml-2">ID: {id}</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowChatModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-blue-500 shadow-lg shadow-blue-900/20"
                    >
                        <MessageSquare className="w-4 h-4" /> Agent Chat
                    </button>

                    <div className="h-6 w-px bg-gray-800 mx-2" />

                    <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded border border-gray-700">
                        <span className="text-xs font-medium text-gray-400">YOLO Mode</span>
                        <button
                            onClick={() => setYoloMode(!yoloMode)}
                            className={`w-8 h-4 rounded-full transition-colors relative ${yoloMode ? 'bg-red-500' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${yoloMode ? 'left-4.5' : 'left-0.5'}`} style={{ left: yoloMode ? '18px' : '2px' }} />
                        </button>
                    </div>
                    {!isRunning ? (
                        <button onClick={handleStart} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                            <Play className="w-4 h-4" /> Start Env
                        </button>
                    ) : (
                        <button onClick={handleStop} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                            <Square className="w-4 h-4" /> Stop Env
                        </button>
                    )}
                    {ports && Object.entries(ports).map(([port, mappings]) => {
                        const maps = mappings as any[];
                        if (!maps || maps.length === 0) return null;
                        const hostPort = maps[0].HostPort;
                        return (
                            <a
                                key={port}
                                href={`http://${window.location.hostname}:${hostPort}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                title={`Open Port ${port}`}
                            >
                                <ExternalLink className="w-4 h-4" /> {port.split('/')[0]}
                            </a>
                        );
                    })}
                    <button
                        onClick={() => setShowTerminal(true)}
                        className="ml-4 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                        <TerminalIcon className="w-4 h-4" /> Terminal
                    </button>
                    <button
                        onClick={fetchContainerLogs}
                        className="ml-2 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                        <FileText className="w-4 h-4" /> Logs
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Tabs */}
                <div className="w-1/3 border-r border-gray-800 flex flex-col bg-gray-900">
                    <div className="flex border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'projects' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Projects
                        </button>
                        <button
                            onClick={() => setActiveTab('issues')}
                            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'issues' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Issues
                        </button>
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'files' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Files
                        </button>
                    </div>

                    {activeTab === 'projects' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {products.map((product: any) => (
                                <div key={product.id} className="bg-gray-800/50 rounded-lg border border-gray-800 overflow-hidden">
                                    <div
                                        className="p-3 bg-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition-colors"
                                        onClick={() => toggleProduct(product.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {expandedProducts[product.id] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                                            <Box className="w-4 h-4 text-purple-400" />
                                            <span className="font-medium text-sm text-gray-200">{product.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); initProduct(product); }}
                                            disabled={!isRunning || isWorking}
                                            className="text-xs bg-purple-900/50 text-purple-300 hover:bg-purple-900 px-2 py-1 rounded border border-purple-800 transition-colors"
                                        >
                                            Initialize
                                        </button>
                                    </div>

                                    {expandedProducts[product.id] && (
                                        <div className="p-2 space-y-1 bg-gray-900/50">
                                            {product.features?.map((feature: any) => (
                                                <div key={feature.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-800 group">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${feature.status === 'COMPLETED' ? 'bg-green-500' :
                                                                feature.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-600'
                                                            }`} />
                                                        <span className="text-sm text-gray-400 truncate group-hover:text-gray-200">{feature.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => buildFeature(feature, product.name)}
                                                        disabled={!isRunning || isWorking || feature.status === 'COMPLETED'}
                                                        className={`text-xs px-2 py-0.5 rounded transition-colors ${feature.status === 'COMPLETED'
                                                                ? 'text-green-500 cursor-default'
                                                                : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900 border border-blue-800/50'
                                                            }`}
                                                    >
                                                        {feature.status === 'COMPLETED' ? 'Done' : 'Build'}
                                                    </button>
                                                </div>
                                            ))}
                                            {(!product.features || product.features.length === 0) && (
                                                <div className="text-xs text-gray-600 p-2 italic">No features defined.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {products.length === 0 && <div className="text-gray-500 text-sm text-center mt-10">No projects found.</div>}
                        </div>
                    ) : activeTab === 'issues' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {issues.map((issue: any) => (
                                <div key={issue.issue_id} className="bg-gray-800 rounded p-3 border border-gray-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Bug className="w-4 h-4 text-red-400" />
                                            <h4 className="font-medium text-sm text-gray-200">{issue.title}</h4>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded uppercase ${issue.severity === 'Critical' ? 'bg-red-900 text-red-300' :
                                                issue.severity === 'High' ? 'bg-orange-900 text-orange-300' :
                                                    'bg-gray-700 text-gray-400'
                                            }`}>{issue.severity}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{issue.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">{issue.product_name}</span>
                                        <button
                                            onClick={() => fixIssue(issue)}
                                            disabled={!isRunning || isWorking || issue.status === 'Resolved'}
                                            className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded text-xs font-medium transition-colors"
                                        >
                                            {issue.status === 'Resolved' ? 'Resolved' : 'Fix Issue'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {issues.length === 0 && <div className="text-gray-500 text-sm text-center mt-10">No issues found.</div>}
                        </div>
                    ) : (
                        // Files Tab
                        <div className="flex-1 bg-black overflow-hidden">
                            {id && <FileExplorer startupId={id} />}
                        </div>
                    )}
                </div>

                {/* Right Panel: Team Logs */}
                <div className="flex-1 flex flex-col bg-black font-mono text-sm">
                    <div className="h-8 bg-gray-800 flex items-center px-4 text-xs text-gray-400 border-b border-gray-700 justify-between">
                        <div className="flex items-center">
                            <TerminalIcon className="w-3 h-3 mr-2" /> Team Activity Log
                        </div>
                        <button onClick={fetchLogs} className="hover:text-white transition-colors" title="Refresh Logs">
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 text-gray-300">
                        {logs.map((log, i) => {
                            // Color code logs based on agent
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
                </div>
            </div>

            {/* Chat Modal */}
            <ChatModal
                isOpen={showChatModal}
                onClose={() => setShowChatModal(false)}
                logs={logs}
                plan={plan}
                progress={progress}
                waitingApproval={waitingApproval}
                currentStep={currentStep}
                prompt={prompt}
                setPrompt={setPrompt}
                runTask={runTask}
                approveStep={approveStep}
                rejectStep={rejectStep}
                isWorking={isWorking}
                isRunning={isRunning}
            />

            {/* Terminal Modal */}
            {showTerminal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm">
                    <div className="bg-gray-900 w-full h-full max-w-6xl rounded-lg border border-gray-700 flex flex-col shadow-2xl overflow-hidden">
                        <div className="h-10 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 shrink-0">
                            <div className="flex items-center gap-2 text-gray-300 font-mono text-sm">
                                <TerminalIcon className="w-4 h-4" />
                                <span>Terminal</span>
                            </div>
                            <button onClick={() => setShowTerminal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-black p-1 overflow-hidden relative">
                            {id && <TerminalComponent startupId={id} />}
                        </div>
                    </div>
                </div>
            )}

            {/* Container Logs Modal */}
            {showContainerLogs && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm">
                    <div className="bg-gray-900 w-full h-full max-w-4xl rounded-lg border border-gray-700 flex flex-col shadow-2xl overflow-hidden">
                        <div className="h-10 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 shrink-0">
                            <div className="flex items-center gap-2 text-gray-300 font-mono text-sm">
                                <FileText className="w-4 h-4" />
                                <span>Container Logs</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={fetchContainerLogs} className="text-gray-400 hover:text-white transition-colors" title="Refresh">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowContainerLogs(false)} className="text-gray-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-black p-4 overflow-auto">
                            <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{containerLogs}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StartupCodeStudio;
