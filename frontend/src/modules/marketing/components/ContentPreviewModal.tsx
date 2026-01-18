/**
 * @file ContentPreviewModal.tsx
 * @description A modal that displays a high-fidelity preview of a marketing content item.
 * It adapts the UI based on the content's channel (e.g., LinkedIn, Twitter, Email) to simulate
 * how the post will look on that platform.
 */

import React from 'react';
import { X, Heart, MessageCircle, Share2, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { MarketingContentItem } from '@/types/dashboard-types';

interface ContentPreviewModalProps {
    item: MarketingContentItem;
    onClose: () => void;
}

const ContentPreviewModal: React.FC<ContentPreviewModalProps> = ({ item, onClose }) => {

    // Helper to render channel-specific preview
    const renderPreview = () => {
        const channel = item.channel?.toLowerCase() || 'generic';

        switch (true) {
            case channel.includes('linkedin'):
                return <LinkedInPreview item={item} />;
            case channel.includes('twitter') || channel.includes('x'):
                return <TwitterPreview item={item} />;
            case channel.includes('instagram'):
                return <InstagramPreview item={item} />;
            case channel.includes('email'):
                return <EmailPreview item={item} />;
            default:
                return <GenericPreview item={item} />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="border-b px-4 py-3 flex justify-between items-center bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {item.channel || 'Content'} Preview
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="p-6 bg-gray-100 max-h-[80vh] overflow-y-auto flex justify-center">
                    {renderPreview()}
                </div>
            </div>
        </div>
    );
};

// --- Platform Specific Components ---

const LinkedInPreview = ({ item }: { item: MarketingContentItem }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md shadow-sm">
            {/* Header */}
            <div className="p-3 flex gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div>
                    <div className="font-semibold text-sm text-gray-900">Your Company Name</div>
                    <div className="text-xs text-gray-500">12,345 followers</div>
                    <div className="text-xs text-gray-500">Just now • <span className="text-gray-400">🌐</span></div>
                </div>
            </div>

            {/* Body */}
            <div className="px-3 pb-2 text-sm text-gray-800 whitespace-pre-wrap font-sans">
                {item.content_body || 'No content provided.'}
            </div>

            {/* Media */}
            {item.image_url && (
                <div className="w-full bg-gray-100">
                    <img src={item.image_url} alt="Post content" className="w-full object-cover max-h-96" />
                </div>
            )}

            {/* Footer Actions */}
            <div className="px-4 py-2 border-t border-gray-100 flex justify-between text-gray-500">
                <button className="flex items-center gap-1 text-sm font-medium hover:bg-gray-100 px-2 py-1 rounded">
                    <Heart size={18} /> Like
                </button>
                <button className="flex items-center gap-1 text-sm font-medium hover:bg-gray-100 px-2 py-1 rounded">
                    <MessageCircle size={18} /> Comment
                </button>
                <button className="flex items-center gap-1 text-sm font-medium hover:bg-gray-100 px-2 py-1 rounded">
                    <Share2 size={18} /> Share
                </button>
                <button className="flex items-center gap-1 text-sm font-medium hover:bg-gray-100 px-2 py-1 rounded">
                    <Send size={18} /> Send
                </button>
            </div>
        </div>
    );
};

const TwitterPreview = ({ item }: { item: MarketingContentItem }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md p-4">
            <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900 text-sm">Your Company</span>
                        <span className="text-gray-500 text-sm">@company • 1m</span>
                    </div>

                    {/* Body */}
                    <div className="mt-1 text-gray-900 text-[15px] whitespace-pre-wrap leading-tight">
                        {item.content_body || 'No content.'}
                    </div>

                    {/* Media */}
                    {item.image_url && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                            <img src={item.image_url} alt="Tweet media" className="w-full object-cover" />
                        </div>
                    )}

                    {/* Metrics */}
                    <div className="flex justify-between mt-3 text-gray-500 max-w-xs">
                        <MessageCircle size={16} />
                        <Share2 size={16} /> {/* Retweet icon substitute */}
                        <Heart size={16} />
                        <Share2 size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const InstagramPreview = ({ item }: { item: MarketingContentItem }) => {
    return (
        <div className="bg-white border border-gray-200 w-full max-w-xs mx-auto shadow-sm">
            {/* Header */}
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-purple-600 rounded-full p-[2px]">
                        <div className="w-full h-full bg-white rounded-full border-2 border-transparent"></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">your_company</span>
                </div>
                <MoreHorizontal size={20} className="text-gray-600" />
            </div>

            {/* Image */}
            <div className="aspect-square bg-gray-100">
                {item.image_url ? (
                    <img src={item.image_url} alt="Insta post" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                )}
            </div>

            {/* Actions */}
            <div className="p-3">
                <div className="flex justify-between mb-2">
                    <div className="flex gap-4 text-gray-800">
                        <Heart size={24} />
                        <MessageCircle size={24} />
                        <Send size={24} />
                    </div>
                    <Bookmark size={24} className="text-gray-800" />
                </div>

                {/* Caption */}
                <div className="text-sm">
                    <span className="font-semibold mr-2">your_company</span>
                    <span className="text-gray-900">{item.content_body}</span>
                </div>
            </div>
        </div>
    );
};

const EmailPreview = ({ item }: { item: MarketingContentItem }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-3 text-xs text-gray-500">
                <div className="flex gap-2 mb-1">
                    <span className="font-semibold text-gray-700 w-12">From:</span>
                    <span>Your Company &lt;hello@company.com&gt;</span>
                </div>
                <div className="flex gap-2">
                    <span className="font-semibold text-gray-700 w-12">Subject:</span>
                    <span className="text-gray-900 font-medium">{item.title}</span>
                </div>
            </div>
            <div className="p-6 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {item.content_body || 'No body content.'}

                {item.image_url && (
                    <div className="mt-4">
                        <img src={item.image_url} alt="Email" className="rounded-md max-w-full" />
                    </div>
                )}
            </div>
        </div>
    );
};

const GenericPreview = ({ item }: { item: MarketingContentItem }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
            <p className="text-gray-500 text-xs mb-4 uppercase">{item.channel}</p>
            <div className="prose text-sm text-gray-800 whitespace-pre-wrap">
                {item.content_body}
            </div>
            {item.image_url && (
                <div className="mt-4">
                    <img src={item.image_url} alt="Preview" className="rounded-md max-w-full" />
                </div>
            )}
        </div>
    );
};

export default ContentPreviewModal;
