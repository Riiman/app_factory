import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Terminal as TerminalIcon, Send, Loader2, CheckCircle, AlertCircle, Users, ExternalLink, RefreshCw, X, Folder, FileText, MessageSquare, ChevronRight, ChevronDown, Bug, Box } from 'lucide-react';
import TerminalComponent from '../../components/TerminalComponent';
import FileExplorer from '../../components/FileExplorer';
import ChatModal from '../../components/ChatModal';
import api, { getWebSocketUrl } from '../../utils/api';
import { io, Socket } from 'socket.io-client';

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
    const [taskStatus, setTaskStatus] = useState<string>('idle');
    const logsEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

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
            } else {
                addLog(`Error starting: ${JSON.stringify(data)}`);
            }
        } catch (e) {
            addLog(`Error: ${e}`);
        }
    };

    // WebSocket connection for real-time environment updates
    useEffect(() => {
        if (!id) return;

        // Connect to /builder namespace
        // Connect to /builder namespace
        const socketUrl = getWebSocketUrl('/builder');
        const socket = io(socketUrl.replace('ws', 'http'), {
            transports: ['websocket'],
            path: '/socket.io'
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to builder namespace');
            // Subscribe to updates for this startup
            socket.emit('subscribe', { startup_id: id });
        });

        socket.on('env_status', (data) => {
            console.log('Received env_status:', data);
            if (data.status === 'running') {
                setIsRunning(true);
                setPorts(data.ports);
                addLog(`Environment is running. Container ID: ${data.container_id}`);
            } else {
                setIsRunning(false);
                setPorts(null);
            }
        });

        socket.on('build_started', (data) => {
            console.log('Build started:', data);
            addLog(`Building ${data.stack_type} environment...`);
        });

        socket.on('build_complete', (data) => {
            console.log('Build complete:', data);
            setIsRunning(true);
            setPorts(data.ports);
            addLog(`Environment ready! Container ID: ${data.container_id}`);
        });

        socket.on('build_failed', (data) => {
            console.log('Build failed:', data);
            addLog(`Build failed: ${data.error}`);
        });

        socket.on('agent_update', (data) => {
            if (data.logs) setLogs(data.logs);
            if (data.plan) setPlan(data.plan);
            if (data.task_status) setTaskStatus(data.task_status);

            if (data.total_tasks) {
                setProgress({
                    completed: data.completed_tasks || 0,
                    total: data.total_tasks
                });
            }

            if (data.waiting_approval) {
                setWaitingApproval(true);
                setIsWorking(false);
                if (data.current_step) setCurrentStep(data.current_step);
                addLog("System paused. Waiting for approval.");
            } else if (data.task_status === 'waiting_interaction') {
                setWaitingApproval(true);
                setIsWorking(false);
                setShowTerminal(true);
            } else if (data.task_status === 'done' || data.task_status === 'qa_passed') {
                setIsWorking(false);
                setWaitingApproval(false);
                addLog('Task completed successfully.');
                fetchData();
            } else if (data.task_status === 'failed') {
                setIsWorking(false);
                setWaitingApproval(false);
                addLog('Task failed.');
            } else if (data.task_status === 'planning_needed' || data.task_status === 'plan_ready' || data.task_status === 'coding' || data.task_status === 'strategizing') {
                setIsWorking(true);
            } else {
                // Default fallback, but don't force true if we are unsure
                // setIsWorking(true); 
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from builder namespace');
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('unsubscribe', { startup_id: id });
                socketRef.current.disconnect();
            }
        };
    }, [id]);

    const handleStop = async () => {
        addLog('Stopping environment...');
        try {
            const res = await fetch(`/api/builder/${id}/stop`, { method: 'POST' });
            const data = await res.json();
            setIsRunning(false);
            setPorts(null);
            addLog(`Environment stopped: ${data.status || 'Success'}`);
        } catch (e) {
            addLog(`Error: ${e}`);
        }
    };

    const [yoloMode, setYoloMode] = useState(true); // Default to YOLO
    const [activeTab, setActiveTab] = useState<'projects' | 'issues' | 'files'>('projects');
    const [showTerminal, setShowTerminal] = useState(false);
    const [showContainerLogs, setShowContainerLogs] = useState(false);
    const [containerLogs, setContainerLogs] = useState('');
    const [waitingApproval, setWaitingApproval] = useState(false);
    const [currentStep, setCurrentStep] = useState<PlanStep | null>(null);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });

    // Separate logs
    const [chatMessages, setChatMessages] = useState<{ role: string, content: string }[]>([]);

    useEffect(() => {
        if (id) {
            fetchData();
            checkAgentStatus(); // Check persistence on load
        }
    }, [id]);

    // Polling removed in favor of WebSockets

    const checkAgentStatus = async () => {
        try {
            const res = await fetch(`/api/builder/${id}/status`);
            const data = await res.json();
            if (data.status === 'active') {
                setIsWorking(true);
                setLogs(data.logs || []);
                setPlan(data.plan || []);
                setTaskStatus(data.task_status || 'unknown');

                if (data.total_tasks > 0) {
                    setProgress({
                        completed: data.completed_tasks,
                        total: data.total_tasks
                    });
                }

                if (data.waiting_approval) {
                    setWaitingApproval(true);
                    setIsWorking(false);
                } else if (data.waiting_interaction) {
                    setWaitingApproval(true);
                    setIsWorking(false);
                    setShowTerminal(true);
                }
            }
        } catch (e) {
            console.error("Failed to check status:", e);
        }
    };

    const fetchData = async () => {
        try {
            const res = await api.get(`/startups/${id}`);
            // @ts-ignore
            if (res.startup) {
                // @ts-ignore
                setProducts(res.startup.products || []);
                // @ts-ignore
                setIssues(res.startup.issues || []);
            }
        } catch (e) {
            console.error(e);
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

    const initProduct = async (product: any) => {
        if (!isRunning) return;
        setIsWorking(true);

        // Only clear logs if starting fresh
        if (product.stage !== 'development') {
            setLogs([]);
            setPlan([]);
            setProgress({ completed: 0, total: 0 });
        }

        try {
            const res = await fetch(`/api/builder/${id}/run-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: `Initialize project structure for ${product.name}. Tech Stack: ${product.tech_stack || 'React + Node.js'}. Create basic scaffold.`,
                    yolo: yoloMode,
                    product_id: product.id // Send ID for status update
                })
            });
            const data = await res.json();
            handleResponse(data);
            fetchData(); // Refresh to show "Resume"
        } catch (e) {
            addLog(`Error: ${e}`);
            setIsWorking(false);
        }
    };

    const buildFeature = async (feature: any, productName: string) => {
        if (!isRunning) return;
        setIsWorking(true);
        setLogs([]);
        setPlan([]);
        setProgress({ completed: 0, total: 0 });

        try {
            const res = await fetch(`/api/builder/${id}/build-feature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feature_id: feature.id,
                    yolo: yoloMode
                })
            });
            const data = await res.json();
            handleResponse(data);
            fetchData(); // Refresh to show "Resume"
        } catch (e) {
            addLog(`Error: ${e}`);
            setIsWorking(false);
        }
    };

    const fixIssue = async (issue: any) => {
        if (!isRunning) return;
        setIsWorking(true);
        setLogs([]);
        setPlan([]);

        try {
            const res = await fetch(`/api/builder/${id}/run-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: `Fix issue: ${issue.title}. Description: ${issue.description}. Severity: ${issue.severity}`,
                    yolo: true
                })
            });
            const data = await res.json();
            handleResponse(data);
        } catch (e) {
            addLog(`Error: ${e}`);
            setIsWorking(false);
        }
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

        // Add user message to chat
        setChatMessages(prev => [...prev, { role: 'user', content: prompt }]);
        const currentPrompt = prompt;
        setPrompt(''); // Clear input

        setIsWorking(true);
        setWaitingApproval(false);
        setPlan([]);
        setLogs([]);
        setProgress({ completed: 0, total: 0 });
        addLog(`Team assigned to task: "${currentPrompt}" (YOLO: ${yoloMode})`);

        // Add placeholder response (since we don't have real streaming chat yet)
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `I've started working on: "${currentPrompt}". check the Team Activity Log for detailed progress.`
            }]);
        }, 500);

        await runTaskInternal(currentPrompt, yoloMode);
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
                    if (isWorking || waitingApproval) {
                        addLog("Task failed.");
                    }
                    setIsWorking(false);
                    setWaitingApproval(false);
                } else if (data.task_status === 'done') {
                    if (isWorking || waitingApproval) {
                        addLog("Task completed successfully.");
                        fetchData();
                    }
                    setIsWorking(false);
                    setWaitingApproval(false);
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
            // Handle async background start
            if (data.message && (data.message.includes("background") || data.message.includes("started"))) {
                addLog(data.message);
                setIsWorking(true);
                // Do not reset other state here, wait for socket updates
                return;
            }

            if (data.logs) setLogs(data.logs);
            if (data.plan) setPlan(data.plan);
            setTaskStatus(data.task_status || 'unknown');

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
            } else if (data.task_status === 'waiting_interaction') {
                setWaitingApproval(true);
                setIsWorking(false);
                setShowTerminal(true);
            } else if (data.task_status === 'failed') {
                addLog('Task failed. Check logs for details.');
                setIsWorking(false);
            } else if (data.task_status === 'done' || data.task_status === 'qa_passed') {
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
                    <button
                        onClick={async () => {
                            if (confirm("Are you sure you want to reset the agent's memory? This will clear all task history.")) {
                                try {
                                    const res = await fetch(`/api/builder/${id}/reset`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.status === 'success') {
                                        setLogs(data.logs || []);
                                        setPlan(data.plan || []);
                                        setTaskStatus(data.task_status || 'unknown');

                                        if (data.waiting_approval) {
                                            setWaitingApproval(true);
                                            setIsWorking(false);
                                        } else if (data.task_status === 'waiting_interaction') {
                                            setWaitingApproval(true); // Reuse approval state to pause polling
                                            setIsWorking(false);
                                            // Automatically open terminal if preferred, or let user click
                                            setShowTerminal(true);
                                        } else if (data.task_status === 'done' || data.task_status === 'failed') {
                                            setIsWorking(false);
                                            setWaitingApproval(false);
                                        }

                                        if (data.total_tasks > 0) {
                                            setProgress({
                                                completed: data.completed_tasks,
                                                total: data.total_tasks
                                            });
                                        }
                                    } else {
                                        alert("Failed to reset: " + data.error);
                                    }
                                } catch (e) {
                                    alert("Error resetting: " + e);
                                }
                            }
                        }}
                        className="ml-2 flex items-center gap-2 bg-red-900/50 hover:bg-red-900 border border-red-800 px-3 py-1.5 rounded text-sm font-medium transition-colors text-red-200"
                        title="Reset Agent Memory"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                </div>
            </div>

            {/* Progress Bar Section */}
            {(isWorking || progress.total > 0) && (
                <div className="h-16 bg-gray-950 border-b border-gray-800 px-4 flex items-center justify-between">
                    <div className="flex-1 max-w-4xl">
                        {/* Progress Bar */}
                        <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span className="font-medium">
                                    {progress.total > 0 ? (
                                        `Task ${progress.completed + 1} of ${progress.total}`
                                    ) : (
                                        'Initializing...'
                                    )}
                                </span>
                                <span>
                                    {progress.total > 0
                                        ? `${Math.round((progress.completed / progress.total) * 100)}%`
                                        : '0%'
                                    }
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                {progress.total > 0 ? (
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                    />
                                ) : (
                                    <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full" />
                                )}
                            </div>
                        </div>
                        {/* Current Task Display */}
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-2 text-gray-300 truncate max-w-[50%]">
                                <span className="text-blue-400 font-semibold">Current:</span>
                                <span className="truncate" title={currentStep?.description || "Planning..."}>
                                    {currentStep?.description || "Planning..."}
                                </span>
                            </div>
                            {plan.length > (progress.completed + 1) && (
                                <div className="flex items-center gap-2 text-gray-500 truncate max-w-[40%]">
                                    <span className="font-semibold">Next:</span>
                                    <span className="truncate">
                                        {plan[progress.completed + 1]?.description || "..."}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                        {isWorking && (
                            <div className="flex items-center gap-2 text-blue-400 text-sm animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Working...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
                    <div className="flex border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === 'projects' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Projects
                        </button>
                        <button
                            onClick={() => setActiveTab('issues')}
                            className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === 'issues' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Issues
                        </button>
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === 'files' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Files
                        </button>
                    </div>

                    {activeTab === 'projects' ? (
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {products.map((product: any) => (
                                <div key={product.id} className="bg-gray-900 rounded border border-gray-800 overflow-hidden">
                                    <div
                                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
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
                                            className={`text-xs px-2 py-1 rounded border transition-colors ${!isRunning ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' :
                                                product.stage === 'development' ? 'bg-yellow-900/50 text-yellow-300 hover:bg-yellow-900 border-yellow-800' :
                                                    'bg-purple-900/50 text-purple-300 hover:bg-purple-900 border-purple-800'
                                                }`}
                                        >
                                            {product.stage === 'development' ? 'Resume' : 'Initialize'}
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
                                                        className={`text-xs px-2 py-0.5 rounded transition-colors ${!isRunning ? 'text-gray-600 cursor-not-allowed' :
                                                            feature.status === 'COMPLETED' ? 'text-green-500 cursor-default' :
                                                                feature.status === 'IN_PROGRESS' ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900 border border-yellow-800/50' :
                                                                    'bg-blue-900/30 text-blue-400 hover:bg-blue-900 border border-blue-800/50'
                                                            }`}
                                                    >
                                                        {feature.status === 'COMPLETED' ? 'Done' : feature.status === 'IN_PROGRESS' ? 'Resume' : 'Build'}
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
                </div >

                {/* Right Panel: Team Logs */}
                < div className="flex-1 flex flex-col bg-black font-mono text-sm" >
                    <div className="h-8 bg-gray-800 flex items-center px-4 text-xs text-gray-400 border-b border-gray-700 justify-between">
                        <div className="flex items-center">
                            <TerminalIcon className="w-3 h-3 mr-2" /> Team Activity Log
                        </div>
                        <button onClick={fetchLogs} className="hover:text-white transition-colors" title="Refresh Logs">
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 text-gray-300">
                        {logs.map((log, i) => {
                            let parsedLog = { agent: "Unknown", message: log, details: "" };
                            let isJson = false;

                            try {
                                if (log.trim().startsWith("{")) {
                                    parsedLog = JSON.parse(log);
                                    isJson = true;
                                }
                            } catch (e) {
                                // Not JSON, use raw string
                            }

                            // Color code logs based on agent
                            let color = "text-gray-300";
                            const agent = isJson ? parsedLog.agent : log;

                            if (agent.includes("Architect")) color = "text-purple-400";
                            if (agent.includes("Planner")) color = "text-blue-400";
                            if (agent.includes("Developer")) color = "text-green-400";
                            if (agent.includes("Reviewer")) color = "text-orange-400";
                            if (agent.includes("Executor")) color = "text-yellow-400";
                            if (agent.includes("Strategist")) color = "text-red-400";
                            if (agent.includes("Tester")) color = "text-pink-400";

                            return (
                                <div key={i} className={`flex flex-col gap-1 ${color} border-b border-gray-800/50 pb-2 last:border-0`}>
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="break-words">
                                            {isJson ? (
                                                <>
                                                    <span className="font-bold">[{parsedLog.agent}]:</span> {parsedLog.message}
                                                </>
                                            ) : (
                                                log
                                            )}
                                        </span>
                                        {isJson && parsedLog.details && (
                                            <button
                                                onClick={() => {
                                                    setContainerLogs(parsedLog.details); // Reuse container logs modal for simplicity
                                                    setShowContainerLogs(true);
                                                }}
                                                className="shrink-0 text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 transition-colors"
                                            >
                                                View Output
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={logsEndRef} />
                    </div>
                </div >
            </div >

            {/* Chat Modal */}
            <ChatModal
                isOpen={showChatModal}
                onClose={() => setShowChatModal(false)}
                prompt={prompt}
                setPrompt={setPrompt}
                runTask={runTask}
                chatMessages={chatMessages}
            />

            {/* Terminal Modal */}
            {
                showTerminal && (
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
                )
            }

            {/* Container Logs Modal */}
            {
                showContainerLogs && (
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
                )
            }
        </div >
    );
};

export default StartupCodeStudio;
