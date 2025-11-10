import React, { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

const SubmissionPage: FC = () => {
  const [messages, setMessages] = useState<Message[]>([{
    sender: 'bot',
    text: "Connecting to chatbot..."
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatComplete, setIsChatComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const startChat = async () => {
      setIsLoading(true);
      try {
        const response = await api.fetch('/submissions/chat/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (data.success) {
          setMessages([{ sender: 'bot', text: data.message }]);
        } else {
          setMessages([{ sender: 'bot', text: data.error || 'Failed to start chat.' }]);
        }
      } catch (error) {
        setMessages([{ sender: 'bot', text: 'Failed to connect to the chatbot service.' }]);
      } finally {
        setIsLoading(false);
      }
    };

    startChat();
  }, [navigate]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading || isChatComplete) return;

    const userMessage: Message = { sender: 'user', text: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.fetch('/submissions/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });
      const data = await response.json();

      if (data.success) {
        const botMessage: Message = { sender: 'bot', text: data.message };
        setMessages(prev => [...prev, botMessage]);
        if (data.is_complete) {
          setIsChatComplete(true);
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      } else {
        const errorMessage: Message = { sender: 'bot', text: data.error || 'An error occurred during chat.' };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = { sender: 'bot', text: 'Failed to communicate with the chatbot.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`rounded-lg px-4 py-2 ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white text-gray-800 rounded-lg px-4 py-2">
              Typing...
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-grow px-4 py-2 border rounded-l-lg focus:outline-none"
            placeholder={isChatComplete ? "Chat complete!" : "Type your message..."}
            disabled={isLoading || isChatComplete}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg"
            disabled={isLoading || isChatComplete}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionPage;
