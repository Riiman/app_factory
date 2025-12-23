import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = "Type your message..."
}) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="relative flex items-center">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full py-3.5 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm disabled:opacity-60 placeholder:text-gray-400"
            />
            <button
                onClick={onSend}
                disabled={!value.trim() || disabled}
                className="absolute right-2 p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
                {disabled && value.trim() ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                )}
            </button>
        </div>
    );
};

export default ChatInput;
