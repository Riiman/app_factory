/**
 * @file CreateContentItemModal.tsx
 * @description A modal component with a form for creating a new marketing content item.
 * It includes fields for title, type, channel, status, and publish date. It intelligently
 * handles the campaign selection based on whether it's opened from a specific campaign page
 * or the global calendar.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MarketingContentItem, MarketingCampaign, MarketingContentStatus } from '../types';

/**
 * Props for the CreateContentItemModal component.
 * @interface CreateContentItemModalProps
 */
interface CreateContentItemModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new content data.
     * @param {Omit<MarketingContentItem, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>} contentData - The new content data for the backend.
     * @param {number} campaignId - The ID of the campaign to which the content belongs.
     */
    onCreate: (contentData: Omit<MarketingContentItem, 'content_id' | 'calendar_id' | 'created_by' | 'created_at'>, campaignId: number) => void;
    /** An array of content-driven campaigns to populate the dropdown. */
    campaigns: MarketingCampaign[];
    /** The ID of the campaign if the modal is opened from a specific campaign page. */
    defaultCampaignId?: number | null;
}

const CreateContentItemModal: React.FC<CreateContentItemModalProps> = ({ onClose, onCreate, campaigns, defaultCampaignId }) => {
    // Form state
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState('Blog Post');
    const [channel, setChannel] = useState('Blog');
    const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<MarketingContentStatus>(MarketingContentStatus.PLANNED);
    const [campaignId, setCampaignId] = useState<string>(defaultCampaignId ? String(defaultCampaignId) : '');

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !campaignId) return;

        onCreate({
            title,
            content_type: contentType,
            channel,
            publish_date: publishDate,
            status,
            content_body: '...', // Default placeholder
        }, parseInt(campaignId, 10));
    };

    const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="mt-1">{children}</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Add New Content Item</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <FormField label="Campaign" id="content-campaign">
                             <select id="content-campaign" value={campaignId} onChange={e => setCampaignId(e.target.value)} required disabled={!!defaultCampaignId} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100">
                                <option value="">Select a campaign...</option>
                                {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Content Title" id="content-title">
                            <input type="text" id="content-title" value={title} onChange={e => setTitle(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Content Type" id="content-type">
                                <input type="text" id="content-type" value={contentType} onChange={e => setContentType(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Blog Post, Tweet" />
                            </FormField>
                            <FormField label="Channel" id="content-channel">
                                <input type="text" id="content-channel" value={channel} onChange={e => setChannel(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Blog, Twitter" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField label="Publish Date" id="content-publish-date">
                                <input type="date" id="content-publish-date" value={publishDate} onChange={e => setPublishDate(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                             <FormField label="Status" id="content-status">
                                <select id="content-status" value={status} onChange={e => setStatus(e.target.value as MarketingContentStatus)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    {Object.values(MarketingContentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </FormField>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Content Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateContentItemModal;