import React, { useEffect, useRef, useState } from 'react';
import { Brain, Hammer, Shield, Zap, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrainPanelProps {
    node: string;
    thoughts: string[];
    isThinking: boolean;
}

const AgentBrain: React.FC<BrainPanelProps> = ({ node, thoughts, isThinking }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thoughts]);

    const getNodeIcon = () => {
        switch (node) {
            case 'planner': return <Brain className="w-6 h-6 text-purple-400" />;
            case 'developer': return <Hammer className="w-6 h-6 text-blue-400" />;
            case 'qa': return <Shield className="w-6 h-6 text-green-400" />;
            default: return <Zap className="w-6 h-6 text-yellow-400" />;
        }
    };

    const getNodeColor = () => {
        switch (node) {
            case 'planner': return 'border-purple-500/50 bg-purple-900/10';
            case 'developer': return 'border-blue-500/50 bg-blue-900/10';
            case 'qa': return 'border-green-500/50 bg-green-900/10';
            default: return 'border-gray-500/50 bg-gray-900/10';
        }
    };

    return (
        <div className={`flex flex-col h-64 border rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300 ${getNodeColor()}`}>

            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-2">
                    {getNodeIcon()}
                    <span className="font-bold text-sm tracking-wide uppercase text-white/90">
                        Agent: {node || 'Idle'}
                    </span>
                </div>
                {isThinking && (
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                        </span>
                        <span className="text-xs text-sky-400 animate-pulse">Processing...</span>
                    </div>
                )}
            </div>

            {/* Thoughts Stream */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm scrollbar-thin scrollbar-thumb-white/10"
            >
                <AnimatePresence>
                    {thoughts.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-white/30 italic text-center mt-10"
                        >
                            Waiting for neural activity...
                        </motion.div>
                    )}
                    {thoughts.map((thought, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                        >
                            <span className="text-white/20 select-none">{'>'}</span>
                            <span className="text-white/80 leading-relaxed font-light">
                                {thought}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-4 w-2 bg-sky-500/50 animate-pulse ml-4"
                    />
                )}
            </div>
        </div>
    );
};

export default AgentBrain;
