import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Terminal as TerminalIcon, Send, Loader2, CheckCircle, AlertCircle, Users, ExternalLink, RefreshCw, X, Folder, FileText, MessageSquare, ChevronRight, ChevronDown, Bug, Box, AlertTriangle } from 'lucide-react';
import TerminalComponent from '../../components/TerminalComponent';
import FileExplorer from '../../components/FileExplorer';
import ChatModal from '../../components/ChatModal';
import AgentBrain from '../../components/AgentBrain';
import api, { getWebSocketUrl } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

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
    const { user, token } = useAuth(); // Correctly get separate token
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [plan, setPlan] = useState<PlanStep[]>([]);
    const [isWorking, setIsWorking] = useState(false);
    const [ports, setPorts] = useState<any>(null);
    const [taskStatus, setTaskStatus] = useState<string>('idle');
    const [missionQueue, setMissionQueue] = useState<any[]>([]);
    const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);

    // V3 V3 V3: New Thought States
    const [activeNode, setActiveNode] = useState<string>('idle');

    const [thoughts, setThoughts] = useState<string[]>([]);

    // New State for Refactor
    const [showChatModal, setShowChatModal] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [issues, setIssues] = useState<any[]>([]);
    const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
    const [fileRefreshKey, setFileRefreshKey] = useState(0);

    // State for UX hardening
    const [isStarting, setIsStarting] = useState(false);
    const [isPreviewOpening, setIsPreviewOpening] = useState(false);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => {
            // Deduplication: Don't add if identical to the very last message (ignoring legacy timestamp checks if plain string)
            // But here we format with timestamp. Let's check the content content.
            if (prev.length > 0) {
                const lastLog = prev[prev.length - 1];
                if (lastLog.includes(msg)) {
                    return prev;
                }
            }
            const logMsg = `[${new Date().toLocaleTimeString()}] ${msg} `;
            return [...prev, logMsg];
        });
        setThoughts(prev => {
            // Basic deduplication for thoughts too
            if (prev.length > 0) {
                const lastThought = prev[prev.length - 1];
                if (lastThought === msg || lastThought.includes(msg)) return prev;
            }
            const logMsg = `[${new Date().toLocaleTimeString()}] ${msg} `;
            return [...prev, logMsg];
        });
    };

    const handleStart = async () => {
        if (isStarting || isRunning) return;
        setIsStarting(true);
        addLog('Starting environment...');
        try {
            const res = await fetch(`/api/builder/${id}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stack_type: 'Universal' // Explicitly request Universal (though backend defaults to it)
                })
            });
            let data;
            try {
                data = await res.json();
            } catch (e) {
                addLog(`Error parsing response: ${res.status} ${res.statusText}`);
                setIsStarting(false);
                return;
            }
            if (data.status === 'running' || data.status === 'created' || data.status === 'success') {
                setIsRunning(true);
                if (data.ports) setPorts(data.ports);
                addLog(`Environment started. ${data.message || ''}`);
            } else if (data.status === 'building') {
                addLog(`Environment is building... this may take a few minutes. (${data.message})`);
            } else {
                addLog(`Error starting: ${JSON.stringify(data)}`);
            }
        } catch (e) {
            addLog(`Error: ${e}`);
        } finally {
            setIsStarting(false);
        }
    };

    // WebSocket connection for real-time environment updates
    useEffect(() => {
        if (!id || !token) return;

        let socket: WebSocket | null = null;
        let reconnectTimeout: any = null;

        const connect = () => {
            const wsUrl = getWebSocketUrl('/ws/dashboard-notifications');
            socket = new WebSocket(`${wsUrl}?token=${token}`);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('Connected to notification server');
                // Standard subscribe message
                if (id) {
                    socket?.send(JSON.stringify({
                        type: 'subscribe',
                        startup_id: id
                    }));
                }
            };

            socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const data = msg.data;

                    switch (msg.type) {
                        case 'env_status':
                            if (data.status === 'running') {
                                setIsRunning(true);
                                setPorts(data.ports);
                            } else {
                                setIsRunning(false);
                                setPorts(null);
                                setIsWorking(false);
                            }
                            break;

                        case 'build_started':
                            addLog(`Building ${data.stack_type} environment...`);
                            break;

                        case 'build_complete':
                            setIsRunning(true);
                            setPorts(data.ports);
                            addLog(`Environment ready! Container ID: ${data.container_id}`);
                            break;

                        case 'build_failed':
                            addLog(`Error: ${data.error}`);
                            break;

                        case 'agent_update':
                            console.log('[DEBUG WS] Agent Update Received:', data); // Debug Log
                            if (data.logs && Array.isArray(data.logs)) {
                                console.log('[DEBUG WS] Logs found:', data.logs); // Debug Log
                                setLogs(prev => [...prev, ...data.logs]);

                                // RESTORED: Map logs to thoughts so they appear in AgentBrain
                                const newThoughts = data.logs.map((l: any) => {
                                    if (typeof l === 'object') return JSON.stringify(l);
                                    return l;
                                });
                                console.log('[DEBUG WS] New Thoughts generated:', newThoughts); // Debug Log
                                setThoughts(prev => [...prev, ...newThoughts]);
                            } else {
                                console.log('[DEBUG WS] No logs in agent_update payload'); // Debug Log
                            }
                            if (data.plan) setPlan(data.plan);
                            if (data.task_status) setTaskStatus(data.task_status);
                            if (data.node) setActiveNode(data.node);

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
                            } else if (['done', 'qa_passed', 'failed', 'paused'].includes(data.task_status)) {
                                setIsWorking(false);
                                setWaitingApproval(false);
                                if (data.task_status === 'done') fetchData();
                            } else if (['planning', 'coding', 'strategizing'].includes(data.task_status)) {
                                setIsWorking(true);
                            }

                            if (data.mission_queue) setMissionQueue(data.mission_queue);

                            // Calculate Index dynamically if current_mission object is passed
                            if (data.current_mission && data.mission_queue) {
                                const idx = data.mission_queue.findIndex((m: any) => m.id === data.current_mission.id);
                                if (idx !== -1) setCurrentMissionIndex(idx);
                            } else if (data.current_mission_index !== undefined) {
                                setCurrentMissionIndex(data.current_mission_index);
                            }
                            break;

                        case 'agent_thought':
                            if (data.content) {
                                setThoughts(prev => [...prev, data.content]);
                            }
                            if (data.node) setActiveNode(data.node);
                            break;
                    }
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            socket.onclose = () => {
                console.log('WS Closed. Reconnecting in 3s...');
                reconnectTimeout = setTimeout(connect, 3000);
            };

            socket.onerror = (e) => {
                console.error('WS Error:', e);
                socket?.close();
            };
        };

        connect();

        return () => {
            if (socket) {
                socket.onclose = null; // Prevent reconnect on unmount
                socket.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [id, user?.token]);

    const handleStop = async () => {
        addLog('Stopping environment...');
        try {
            const res = await fetch(`/api/builder/${id}/stop`, { method: 'POST' });
            const data = await res.json();
            setIsRunning(false);
            setPorts(null);
            // Explicitly stop working state
            setIsWorking(false);
            addLog(`Environment stopped: ${data.status || 'Success'}`);
        } catch (e) {
            addLog(`Error: ${e}`);
        }
    };

    const handlePause = async () => {
        if (!isWorking) return;
        addLog('Pausing process...');
        try {
            const res = await fetch(`/api/builder/${id}/pause`, { method: 'POST' });
            const data = await res.json();
            if (data.status === 'success') {
                // Wait for socket update to confirm pause, but optimistic update is fine
            }
        } catch (e) {
            addLog(`Error pausing: ${e}`);
        }
    };

    const handleResume = async () => {
        addLog('Resuming process...');
        try {
            const res = await fetch(`/api/builder/${id}/v3/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (data.status === 'success') {
                // setIsWorking(true); // Let socket handle it
            }
        } catch (e) {
            addLog(`Error resuming: ${e}`);
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

    // Rebuild Warning Modal State
    const [showRebuildWarning, setShowRebuildWarning] = useState(false);
    const [targetProduct, setTargetProduct] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchData();
            checkAgentStatus(); // Check persistence on load
            checkEnvStatus(); // Check container status
        }
    }, [id]);

    // Polling removed in favor of WebSockets

    const checkEnvStatus = async () => {
        try {
            const res = await fetch(`/api/builder/${id}/env-status`);
            const data = await res.json();
            if (data.status === 'running') {
                setIsRunning(true);
                setPorts(data.ports);
                addLog(`Environment is active. Container ID: ${data.container_id}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const checkAgentStatus = async () => {
        try {
            const res = await fetch(`/api/builder/${id}/status`);
            const data = await res.json();
            if (data.status === 'active') {
                setIsWorking(true);
                setLogs(data.logs || []);
                setPlan(data.plan || []);
                setTaskStatus(data.task_status || 'unknown');
                setThoughts(data.thoughts || []); // Restore thoughts if available

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

                if (data.mission_queue) setMissionQueue(data.mission_queue);
                if (data.current_mission_index !== undefined) setCurrentMissionIndex(data.current_mission_index);
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
        setIsWorking(true);
        setWaitingApproval(false);
        setPlan([]);
        setLogs([]);
        setThoughts([]); // Clear thoughts for new task
        setActiveNode("planning"); // Reset node

        addLog(`Auto-Triggered Task: "${taskPrompt}"`);

        // V3 API Call
        try {
            await fetch(`/api/builder/v3/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startup_id: id,
                    mission: taskPrompt
                })
            });
        } catch (e) {
            addLog(`Error triggering agent: ${e}`);
            setIsWorking(false);
        }
    };

    const initProduct = async (product: any) => {
        if (!isRunning) return;
        setIsWorking(true);

        // Only clear logs if starting fresh
        if (product.stage !== 'development') {
            setLogs([]);
            setPlan([]);
            setMissionQueue([]);
            setCurrentMissionIndex(0);
            setProgress({ completed: 0, total: 0 });
        }

        try {
            // Updated to use the new 'build-product' endpoint
            const res = await fetch(`/api/builder/${id}/build-product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: product.id, // Send ID for status update
                    yolo: yoloMode
                })
            });
            const data = await res.json();

            if (data.status === 'no_changes') {
                setIsWorking(false);
                setTargetProduct(product);
                setShowRebuildWarning(true);
                addLog(data.message);
                return;
            }

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

    const confirmRebuild = async () => {
        if (!targetProduct) return;
        setShowRebuildWarning(false);
        setIsWorking(true);
        addLog(`Forcing fresh rebuild for ${targetProduct.name}...`);

        try {
            const res = await fetch(`/api/builder/${id}/build-product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: targetProduct.id,
                    yolo: yoloMode,
                    force_rebuild: true
                })
            });
            const data = await res.json();
            handleResponse(data);
        } catch (e) {
            addLog(`Error rebuilding: ${e}`);
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
        setThoughts([]);
        setActiveNode("planning");

        addLog(`Team assigned to task: "${currentPrompt}"`);

        // Add placeholder response
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `I've started working on: "${currentPrompt}". check the Brain View for real-time thoughts.`
            }]);
        }, 500);

        try {
            await fetch(`/api/builder/v3/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startup_id: id,
                    mission: currentPrompt
                })
            });
        } catch (e) {
            addLog(`Error running task: ${e}`);
            setIsWorking(false);
        }
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
                        <button onClick={handleStart} disabled={isStarting} className={`flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-medium transition-colors ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {isStarting ? 'Starting...' : 'Start Env'}
                        </button>
                    ) : (
                        <>
                            {isWorking && (
                                <button onClick={handlePause} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                                    <span className="w-4 h-4 flex items-center justify-center font-bold">||</span> Pause
                                </button>
                            )}
                            {!isWorking && taskStatus === 'paused' && (
                                <button onClick={handleResume} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                                    <Play className="w-4 h-4" /> Resume
                                </button>
                            )}
                            <button onClick={handleStop} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                                <Square className="w-4 h-4" /> Stop Env
                            </button>
                        </>
                    )}
                    {(() => {
                        // Strict Preview Logic:
                        // 1. Must have Ports (Env Running)
                        // 2. Must NOT be 'opening' (Loading state)
                        // 3. Must NOT be 'working' (Agent is changing code)
                        // 4. Must be in a STABLE state ('done', 'paused', 'qa_passed', 'failed')
                        //    - 'idle'/'unknown' = Initial state, code likely not ready -> Disabled
                        const isTaskStable = ['done', 'paused', 'qa_passed', 'failed'].includes(taskStatus);
                        const canPreview = ports && !isPreviewOpening && !isWorking && isTaskStable;

                        return (
                            <button
                                onClick={async () => {
                                    if (!canPreview) return;
                                    setIsPreviewOpening(true);
                                    // Simple timeout to prevent double-clicks
                                    setTimeout(() => setIsPreviewOpening(false), 2000);
                                    window.open(`/api/startups/${id}/preview/`, '_blank');
                                }}
                                disabled={!canPreview}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${canPreview
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    }`}
                                title={
                                    !ports ? "Preview not available (Server not started)" :
                                        isWorking ? "Agent is working... Preview disabled." :
                                            !isTaskStable ? "Preview disabled (Waiting for task completion)" :
                                                "Open Preview"
                                }
                            >
                                {isPreviewOpening ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Preview
                            </button>
                        );
                    })()}
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
                                        if (data.logs) {
                                            // MERGE STRATEGY: Treat logs as thoughts.
                                            // Filter out json strings if needed, or just push them.
                                            // We map them to strings to be safe (AgentBrain expects string[]).
                                            const newThoughts = data.logs.map((l: any) => {
                                                if (typeof l === 'object') return JSON.stringify(l);
                                                return l;
                                            });

                                            setThoughts(prev => [...prev, ...newThoughts]);

                                            // Still keep legacy logs for internal tracking if needed,
                                            // but we won't display them in a separate panel.
                                            setLogs(prev => [...prev, ...data.logs]);
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
                <div className="min-h-16 h-auto py-2 bg-gray-950 border-b border-gray-800 px-4 flex items-center justify-between">
                    <div className="flex-1 max-w-4xl">
                        {/* Granular Progress Bar */}
                        <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span className="font-medium">
                                    {progress.total > 0 ? (
                                        `Task ${Math.min(progress.completed + 1, progress.total)} of ${progress.total}`
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

                        {/* Mission Progress Bar - Only if Mission Queue exists */}
                        {missionQueue.length > 0 && (
                            <div className="mb-2">
                                <div className="flex justify-between text-xs text-blue-300 mb-1">
                                    <span className="font-medium">
                                        Mission {currentMissionIndex + 1} of {missionQueue.length}: {missionQueue[currentMissionIndex]?.title}
                                    </span>
                                    <span>
                                        {Math.round(((currentMissionIndex) / missionQueue.length) * 100)}% Overall
                                    </span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-1.5">
                                    <div
                                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${((currentMissionIndex) / missionQueue.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Current Task Display */}
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-2 text-gray-300 truncate max-w-[50%]">
                                <span className="text-blue-400 font-semibold">Current:</span>
                                <span className="truncate" title={currentStep?.description || (missionQueue.length > 0 ? `Planning: ${missionQueue[currentMissionIndex]?.title}` : "Planning...")}>
                                    {currentStep?.description || (missionQueue.length > 0 ? `Planning: ${missionQueue[currentMissionIndex]?.title}` : "Planning...")}
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
                        {!isWorking && taskStatus === 'paused' && (
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                <span className="flex items-center gap-1 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-800/50">
                                    <Square className="w-3 h-3 fill-current" /> Paused
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

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
                                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${!isRunning || isWorking ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' :
                                                product.stage === 'development' ? 'bg-yellow-900/50 text-yellow-300 hover:bg-yellow-900 border-yellow-800' :
                                                    'bg-purple-900/50 text-purple-300 hover:bg-purple-900 border-purple-800'
                                                }`}
                                        >
                                            {isWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                            {isWorking ? 'building...' : 'Build Product'}
                                        </button>
                                    </div>

                                    {expandedProducts[product.id] && (
                                        <div className="bg-gray-950 p-2 border-t border-gray-800 space-y-2">
                                            {product.features?.map((feature: any) => (
                                                <div key={feature.id} className="flex flex-col gap-1 p-2 rounded bg-gray-900 border border-gray-800">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-gray-300">{feature.name}</span>

                                                        {/* Status Badge */}
                                                        {feature.status === 'completed' ? (
                                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-800">
                                                                <CheckCircle className="w-3 h-3" /> Done
                                                            </span>
                                                        ) : feature.status === 'in_progress' ? (
                                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800 animate-pulse">
                                                                <Loader2 className="w-3 h-3 animate-spin" /> Building...
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-500 px-2 py-0.5">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 line-clamp-2">{feature.description}</p>
                                                </div>
                                            ))}
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
                            {id && <FileExplorer startupId={id} refreshKey={fileRefreshKey} />}
                        </div>
                    )}
                </div >

                {/* Right Panel: Team Logs (Merged into Brain) */}
                <div className="flex-1 flex flex-col bg-black font-mono text-sm border-l border-gray-800 min-h-0">
                    {/* V3 Brain View - Full Height */}
                    <div className="flex-1 bg-gray-950 p-2 min-h-0">
                        <div className="h-full">
                            <AgentBrain node={activeNode} thoughts={thoughts} isThinking={isWorking} startupId={id} />
                        </div>
                    </div>
                </div>
            </div>

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

            {/* Rebuild Warning Modal */}
            <Transition appear show={showRebuildWarning} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowRebuildWarning(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-red-500/30 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center gap-2">
                                        <div className="p-2 rounded-full bg-orange-500/20 text-orange-400">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        Project Already Built
                                    </Dialog.Title>
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-400">
                                            This project has already been fully built and there are no new features to implement.
                                        </p>
                                        <p className="text-sm text-gray-400 mt-2">
                                            Do you want to <span className="text-red-400 font-bold">WIPE EVERYTHING</span> and start a fresh build? This action cannot be undone.
                                        </p>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setShowRebuildWarning(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            onClick={confirmRebuild}
                                        >
                                            Wipe & Rebuild
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div >
    );
};

export default StartupCodeStudio;

