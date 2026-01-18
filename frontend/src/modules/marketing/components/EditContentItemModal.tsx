/**
 * @file EditContentItemModal.tsx
 * @description A modal component for editing an existing marketing content item.
 * It pre-fills the form with the item's current data and handles the update submission.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MarketingContentItem, MarketingContentStatus } from '@/types/dashboard-types';
import api from '@/utils/api';

/**
 * Props for the EditContentItemModal component.
 * @interface EditContentItemModalProps
 */
interface EditContentItemModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated content data.
     * @param {number} contentId - The ID of the content item being updated.
     * @param {Partial<MarketingContentItem>} contentData - The updated content data.
     */
    onUpdate: (contentId: number, contentData: Partial<MarketingContentItem>) => void;
    /** The content item to edit. */
    item: MarketingContentItem;
    /** The ID of the startup. */
    startupId: number;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const EditContentItemModal: React.FC<EditContentItemModalProps> = ({ onClose, onUpdate, item, startupId }) => {
    // Form state initialized with item data
    const [title, setTitle] = useState(item.title);
    const [contentType, setContentType] = useState(item.content_type || '');
    const [channel, setChannel] = useState(item.channel || '');
    // Handle potential date string format
    const initialDate = item.publish_date ? new Date(item.publish_date).toISOString().split('T')[0] : '';
    const [publishDate, setPublishDate] = useState(initialDate);
    const [status, setStatus] = useState<MarketingContentStatus>(item.status);

    // Split Content
    const [contentBrief, setContentBrief] = useState(item.content_brief || '');
    const [contentBody, setContentBody] = useState(item.content_body || '');

    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (item) {
            setTitle(item.title);
            setContentType(item.content_type || '');
            setChannel(item.channel || '');
            setPublishDate(item.publish_date ? new Date(item.publish_date).toISOString().split('T')[0] : '');
            setStatus(item.status);
            setContentBrief(item.content_brief || ''); // Removed fallback to body to prevent confusion
            setContentBody(item.content_body || '');
        }
    }, [item]);



    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Need to save the brief first? ideally no, backend uses the DB item.
            // But if user edited the brief, we should probably save it first or pass it.
            // For now, simpler workflow: User saves brief first or we just call generate on the ID.
            // BETTER: send the current brief in the generating request? 
            // Current backend implementation fetches from DB. So we must Update then Generate.

            // 1. Update first
            await api.updateContentItem(startupId, item.content_id, {
                content_brief: contentBrief
            });

            // 2. Generate
            const result = await api.generateContentItem(startupId, item.content_id);
            if (result && result.content_body) {
                setContentBody(result.content_body);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to generate content. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Handles form submission, packages the data, and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for mandatory fields
        if (!title.trim()) {
            alert('Please enter a content title.');
            return;
        }
        if (!publishDate) {
            alert('Please select a publish date.');
            return;
        }

        onUpdate(item.content_id, {
            title,
            content_type: contentType,
            channel,
            publish_date: publishDate,
            status,
            content_brief: contentBrief,
            content_body: contentBody,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Content Item</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row h-[80vh]">
                    {/* Left Column: Metadata & Brief */}
                    <div className="w-full md:w-1/2 p-6 space-y-4 overflow-y-auto border-r border-gray-100">
                        <FormField label="Content Title *" id="content-title">
                            <input type="text" id="content-title" value={title} onChange={e => setTitle(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Content Type *" id="content-type">
                                <input type="text" id="content-type" value={contentType} onChange={e => setContentType(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Blog Post, Tweet" />
                            </FormField>
                            <FormField label="Channel *" id="content-channel">
                                <input type="text" id="content-channel" value={channel} onChange={e => setChannel(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Blog, Twitter" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Publish Date *" id="content-publish-date">
                                <input type="date" id="content-publish-date" value={publishDate} onChange={e => setPublishDate(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                            <FormField label="Status" id="content-status">
                                <select id="content-status" value={status} onChange={e => setStatus(e.target.value as MarketingContentStatus)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    {Object.values(MarketingContentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </FormField>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <FormField label="Content Strategy / Brief" id="content-brief">
                                <p className="text-xs text-gray-500 mb-1">Describe what this content should be about. This is the logic/instruction.</p>
                                <textarea id="content-brief" rows={6} value={contentBrief} onChange={e => setContentBrief(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm bg-blue-50" placeholder="e.g., Use a confident tone to announce our new feature..." />
                            </FormField>
                        </div>
                    </div>

                    {/* Right Column: Final Content */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="content-body" className="block text-sm font-medium text-gray-700">Final Content</label>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="text-xs flex items-center gap-1 bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full shadow-sm hover:bg-purple-50 transition-colors"
                            >
                                {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                            </button>
                        </div>
                        <textarea
                            id="content-body"
                            className="flex-1 w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-3 font-mono text-sm leading-relaxed"
                            placeholder="The final output will appear here..."
                            value={contentBody}
                            onChange={e => setContentBody(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Save Changes</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditContentItemModal;
