import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Type } from 'lucide-react';
import api from '@/utils/api';

interface QuickCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    startupId: number;
    onSuccess?: () => void;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ isOpen, onClose, startupId, onSuccess }) => {
    const [topic, setTopic] = useState('');
    const [channel, setChannel] = useState('LinkedIn');
    const [contentType, setContentType] = useState<'text_only' | 'image' | 'video'>('text_only');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setIsGenerating(true);
        setError(null);

        try {
            await api.post(`/startups/${startupId}/marketing/quick-create`, {
                topic,
                channel,
                content_type: contentType
            });
            onSuccess?.();
            onClose();
            setTopic(''); // Reset form
        } catch (err: any) {
            setError(err.message || 'Failed to generate content');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                Quick Create Content
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Channel Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                                <select
                                    value={channel}
                                    onChange={(e) => setChannel(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
                                >
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Twitter">Twitter / X</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Email">Email Blast</option>
                                    <option value="Blog">Blog Post</option>
                                </select>
                            </div>

                            {/* Content Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => setContentType('text_only')}
                                        className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${contentType === 'text_only'
                                                ? 'border-brand-primary text-brand-primary bg-indigo-50'
                                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Type className="h-4 w-4 mr-2" />
                                        Text Only
                                    </button>
                                    <button
                                        onClick={() => setContentType('image')}
                                        className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${contentType === 'image'
                                                ? 'border-brand-primary text-brand-primary bg-indigo-50'
                                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        Text + Image
                                    </button>
                                </div>
                            </div>

                            {/* Topic Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">What's this post about?</label>
                                <textarea
                                    className="shadow-sm focus:ring-brand-primary focus:border-brand-primary mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                                    rows={4}
                                    placeholder="e.g., Announcing our new feature launch next week..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || !topic.trim()}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-primary text-base font-medium text-white hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:ml-3 sm:w-auto sm:text-sm ${(isGenerating || !topic.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-current rounded-full" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickCreateModal;
