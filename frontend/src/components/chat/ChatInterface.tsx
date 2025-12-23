import React, { useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface Message {
    role?: string;
    sender?: string;
    content: string; // adapted to accept 'text' mapped to 'content' if needed, but we'll normalize in parent
    text?: string;
}

interface ChatInterfaceProps {
    messages: Message[];
    inputValue: string;
    onInputChange: (val: string) => void;
    onSendMessage: () => void;
    isLoading?: boolean;
    isTyping?: boolean; // For showing a typing indicator
    placeholder?: string;
    emptyStateMessage?: React.ReactNode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    inputValue,
    onInputChange,
    onSendMessage,
    isLoading = false,
    isTyping = false,
    placeholder,
    emptyStateMessage
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
                {messages.length === 0 && emptyStateMessage ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        {emptyStateMessage}
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            // Normalize message content
                            const content = msg.content || msg.text || '';
                            const role = msg.role || msg.sender || 'bot';
                            return (
                                <ChatBubble key={index} message={{ role, content }} />
                            );
                        })}
                    </AnimatePresence>
                )}

                {/* Typing Indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start w-full mb-4"
                    >
                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex space-x-1 items-center ml-12">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 z-10 shrink-0">
                <div className="max-w-4xl mx-auto">
                    <ChatInput
                        value={inputValue}
                        onChange={onInputChange}
                        onSend={onSendMessage}
                        disabled={isLoading}
                        placeholder={placeholder}
                    />
                    <div className="text-center mt-2">
                        <span className="text-xs text-gray-400">AI can make mistakes. Please review critical code.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
