import React, { useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    prompt: string;
    setPrompt: (s: string) => void;
    runTask: () => void;
    chatMessages: { role: string; content: string }[];
}

const ChatModal: React.FC<ChatModalProps> = ({
    isOpen, onClose, prompt, setPrompt, runTask, chatMessages
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm">
            <div className="bg-gray-900 w-full h-full max-w-3xl rounded-lg border border-gray-700 flex flex-col shadow-2xl overflow-hidden">
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
                <div className="flex-1 flex flex-col overflow-hidden bg-black">
                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">Ask questions about your code</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    e.g., "What does this component do?" or "How can I add authentication?"
                                </p>
                            </div>
                        ) : (
                            chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-200'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                                placeholder="Ask a question about your code..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && runTask()}
                            />
                            <button
                                onClick={runTask}
                                disabled={!prompt}
                                className="bg-blue-600 hover:bg-blue-700 px-6 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
