import React, { useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import ChatInterface from './chat/ChatInterface';

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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm">
            <div className="bg-white w-full h-full max-w-3xl rounded-xl border border-gray-200 flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-16 bg-white flex items-center justify-between px-6 border-b border-gray-100 shrink-0 z-20">
                    <div className="flex items-center gap-3 text-gray-900 font-bold text-lg">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-brand-600" />
                        </div>
                        <span>Agent Chat</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modern Chat Interface */}
                <div className="flex-1 overflow-hidden relative">
                    <ChatInterface
                        messages={chatMessages}
                        inputValue={prompt}
                        onInputChange={setPrompt}
                        onSendMessage={runTask}
                        placeholder="Ask a question about your code..."
                        emptyStateMessage={
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="p-4 bg-brand-50 rounded-full shadow-sm mb-4">
                                    <MessageSquare className="w-8 h-8 text-brand-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">How can I help you?</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Ask me to explain code, fix bugs, or help you add new features to your project.
                                </p>
                            </div>
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
