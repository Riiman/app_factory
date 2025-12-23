import React, { useState, useEffect, useRef } from 'react';
import { FileText, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import ChatInterface from '../components/chat/ChatInterface';
import Button from '../components/ui/Button';

const SubmissionPage = () => {
    const { user, submissionData, nextQuestion, isLoading, handleLogout, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatContainerRef = useRef(null);
    const initialMessagesSet = useRef(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate('/login');
            } else if (submissionData?.status === 'PENDING' || submissionData?.status === 'FINALIZE_SUBMISSION') {
                navigate('/finalize-submission');
            } else if (submissionData?.status === 'not_started' || !submissionData) {
                navigate('/start-submission');
            } else if (nextQuestion && !initialMessagesSet.current) {
                const greeting = user.full_name ? `Hello ${user.full_name}!` : 'Hello there!';
                setMessages([{ text: greeting, sender: 'bot' }, { text: nextQuestion, sender: 'bot' }]);
                initialMessagesSet.current = true;
            }
        }
    }, [user, isLoading, navigate, nextQuestion]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const newUserMessage = { text: userInput, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsChatLoading(true);

        try {
            const data = await api.chat(userInput);

            // The useAuth hook will automatically update with the new submissionData
            // so we don't need to set it locally.

            setMessages(prev => [...prev, { text: data.next_question, sender: 'bot' }]);

            if (data.is_completed) {
                await refreshUser(); // Refresh auth context to get updated status
                setTimeout(() => {
                    navigate('/finalize-submission');
                }, 1000); // Reduced timeout as we are now waiting for refresh
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, { text: 'Sorry, I encountered an error. Please try again.', sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading Chat...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50 shrink-0">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 relative">
                        {/* Empty left side to balance the absolute centering if using flex, 
                            but for true centering with a right-side element, relative/absolute is best. 
                        */}

                        {/* Centered Logo */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500">
                            VentureStack
                        </div>

                        {/* Right-aligned content */}
                        <div className="ml-auto">
                            <Button
                                className="flex items-center gap-2 text-sm bg-gradient-to-r from-brand-600 to-accent-500 text-white hover:opacity-90 shadow-sm border-0"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Chat Window */}
                <div className="flex-1 flex flex-col relative">
                    <ChatInterface
                        messages={messages as any[]} // explicit cast if needed, though interface overlaps
                        inputValue={userInput}
                        onInputChange={setUserInput}
                        onSendMessage={() => handleSendMessage({ preventDefault: () => { } } as any)}
                        isLoading={isChatLoading}
                        isTyping={isChatLoading}
                        placeholder="Describe your startup idea..."
                        emptyStateMessage={
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's build your startup!</h2>
                                <p className="text-gray-600">Tell me about your idea, and I'll help you create a plan.</p>
                            </div>
                        }
                    />
                </div>

                {/* Submission Summary Sidebar */}
                <div className="w-1/3 min-w-[320px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-40">
                    <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
                        <h2 className="text-xl font-bold text-brand-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-600" />
                            Submission Details
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                        {submissionData ? (
                            <div className="space-y-4">
                                {Object.entries(submissionData).map(([key, value]) => {
                                    if (['id', 'user_id', 'status', 'submitted_at', 'raw_chat_data', 'chat_progress_step', 'user', 'evaluation', 'startup'].includes(key)) {
                                        return null;
                                    }
                                    return (
                                        <div key={key} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 transition-colors group">
                                            <h3 className="text-xs uppercase tracking-wide text-brand-600 font-bold mb-2 flex items-center gap-1 group-hover:text-brand-700">
                                                {key.replace(/_/g, ' ')}
                                            </h3>
                                            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                {value ? String(value) : <span className="text-gray-400 italic">Not yet provided</span>}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 text-brand-200" />
                                </div>
                                <p className="text-gray-900 font-medium">No details yet</p>
                                <p className="text-sm text-gray-500 mt-1 max-w-[200px]">As you chat, extracted details about your startup will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionPage;
