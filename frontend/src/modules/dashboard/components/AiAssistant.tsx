
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AiAssistantProps {
    startupId: number;
    variant?: 'floating' | 'embedded';
}

const AiAssistant: React.FC<AiAssistantProps> = ({ startupId, variant = 'floating' }) => {
    const [isOpen, setIsOpen] = useState(variant === 'embedded');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi! I can help you analyze your venture data. Ask me about your financials, products, or marketing campaigns.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (variant === 'embedded') setIsOpen(true);
    }, [variant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await api.askAiAssistant(startupId, userMessage, messages);
            if (response.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
            } else {
                toast.error('Failed to get response from AI.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong. Please try again.');
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === 'embedded') {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-gray-50">
                <div className="p-4 flex justify-between items-center text-gray-800 shrink-0 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                        <Bot size={24} className="text-blue-600" />
                        <span className="font-medium text-lg">Venture Assistant</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                }`}>
                                <div className="markdown-content font-sans text-sm">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                            h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-2 text-gray-600 italic" {...props} />,
                                            code: ({ node, inline, className, children, ...props }: any) => {
                                                return inline ? (
                                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs" {...props}>{children}</code>
                                                ) : (
                                                    <code className="block bg-gray-100 p-2 rounded font-mono text-xs my-2 overflow-x-auto" {...props}>{children}</code>
                                                )
                                            }
                                        }}
                                    >
                                        {msg.content
                                            .replace(/\\\[/g, '$$$')
                                            .replace(/\\\]/g, '$$$')
                                            .replace(/\\\(/g, '$')
                                            .replace(/\\\)/g, '$')
                                        }
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-lg p-3 rounded-bl-none shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 size={14} className="animate-spin" />
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200 shrink-0">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="bg-blue-600 p-3 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <Bot size={20} />
                            <span className="font-medium">Venture Assistant</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                    }`}>
                                    <div className="markdown-content font-sans text-sm">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-2 text-gray-600 italic" {...props} />,
                                                code: ({ node, inline, className, children, ...props }: any) => {
                                                    return inline ? (
                                                        <code className="bg-gray-100 px-1 rounded font-mono text-xs" {...props}>{children}</code>
                                                    ) : (
                                                        <code className="block bg-gray-100 p-2 rounded font-mono text-xs my-2 overflow-x-auto" {...props}>{children}</code>
                                                    )
                                                },
                                                table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-300 border border-gray-200" {...props} /></div>,
                                                thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
                                                tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 bg-white" {...props} />,
                                                tr: ({ node, ...props }) => <tr {...props} />,
                                                th: ({ node, ...props }) => <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                                                td: ({ node, ...props }) => <td className="px-3 py-4 text-sm text-gray-700 whitespace-nowrap" {...props} />,
                                            }}
                                        >
                                            {msg.content
                                                .replace(/\\\[/g, '$$$')
                                                .replace(/\\\]/g, '$$$')
                                                .replace(/\\\(/g, '$')
                                                .replace(/\\\)/g, '$')
                                            }
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 rounded-bl-none shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-200 ${isOpen ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>
        </div>
    );
};

export default AiAssistant;
