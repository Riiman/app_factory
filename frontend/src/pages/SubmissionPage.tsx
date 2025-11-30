import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const SubmissionPage = () => {
    const { user, submissionData, nextQuestion, isLoading } = useAuth();
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
                setTimeout(() => {
                    navigate('/pending-review');
                }, 3000);
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
        <div className="flex h-screen bg-gray-100">
            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`my-2 flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`p-3 rounded-lg max-w-lg ${msg.sender === 'bot' ? 'bg-white text-gray-800' : 'bg-blue-500 text-white'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && <div className="text-center text-gray-500">Bot is thinking...</div>}
                </div>
                <div className="border-t p-4 bg-white">
                    <form onSubmit={handleSendMessage} className="flex">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type your message..."
                            disabled={isChatLoading}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
                            disabled={isChatLoading}
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>

            {/* Submission Summary Sidebar */}
            <div className="w-1/3 bg-white border-l p-6 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Your Submission Details</h2>
                {submissionData ? (
                    <div>
                        {Object.entries(submissionData).map(([key, value]) => {
                             if (['id', 'user_id', 'status', 'submitted_at', 'raw_chat_data', 'chat_progress_step', 'user', 'evaluation', 'startup'].includes(key)) {
                                return null;
                            }
                            return (
                                <div key={key} className="mb-4">
                                    <h3 className="font-semibold capitalize">{key.replace(/_/g, ' ')}</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{value ? value : <span className="text-gray-400">Not yet provided</span>}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p>Your extracted data will appear here...</p>
                )}
            </div>
        </div>
    );
};

export default SubmissionPage;
