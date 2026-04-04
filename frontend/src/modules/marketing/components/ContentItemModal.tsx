
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MarketingContentItem, MarketingContentStatus, MarketingCampaign } from '@/types/dashboard-types';
import api from '@/utils/api';
import toast from 'react-hot-toast';

/**
 * Props for the ContentItemModal component.
 * @interface ContentItemModalProps
 */
interface ContentItemModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission.
     * @param {Partial<MarketingContentItem>} contentData - The updated or new content data.
     * @param {number} [campaignId] - The ID of the selected campaign (only relevant in Create mode if selecting campaign).
     */
    onSave: (contentData: Partial<MarketingContentItem>, campaignId?: number) => Promise<void>;
    /** The content item to edit. If null/undefined, mode is "Create". */
    item?: MarketingContentItem | null;
    /** The ID of the startup. */
    startupId: number;
    /** List of available channels for this campaign. Required if not selecting campaign. */
    availableChannels?: string[];
    /** List of campaigns to choose from. If provided and item is null, allows selecting campaign. */
    campaigns?: MarketingCampaign[];
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const ContentItemModal: React.FC<ContentItemModalProps> = ({ onClose, onSave, item, startupId, availableChannels: initialAvailableChannels = [], campaigns = [] }) => {
    const isEditing = !!item;

    // Form state
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState('');
    const [channel, setChannel] = useState('');
    const [publishDate, setPublishDate] = useState('');
    const [status, setStatus] = useState<MarketingContentStatus>(MarketingContentStatus.DRAFT);
    const [contentBrief, setContentBrief] = useState('');
    const [contentBody, setContentBody] = useState('');

    // Campaign Selection State (for global create mode)
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [currentAvailableChannels, setCurrentAvailableChannels] = useState<string[]>(initialAvailableChannels);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize state on load or item change
    useEffect(() => {
        if (item) {
            setTitle(item.title);
            setContentType(item.content_type || '');
            setChannel(item.channel || '');
            setPublishDate(item.publish_date ? new Date(item.publish_date).toISOString().split('T')[0] : '');
            setStatus(item.status);
            setContentBrief(item.content_brief || '');
            setContentBody(item.content_body || '');
            setCurrentAvailableChannels(initialAvailableChannels);
        } else {
            // Defaults for Create Mode
            setTitle('');
            setContentType('');
            setPublishDate(new Date().toISOString().split('T')[0]);
            setStatus(MarketingContentStatus.DRAFT);
            setContentBrief('');
            setContentBody('');
            // Channel reset/default logic depends on campaign selection
        }
    }, [item, initialAvailableChannels]);

    // Handle Campaign Selection Change
    useEffect(() => {
        if (!isEditing && campaigns.length > 0 && selectedCampaignId) {
            const campaign = campaigns.find(c => c.campaign_id === selectedCampaignId);
            if (campaign && campaign.channel) {
                const channels = campaign.channel.split(',').map(c => c.trim());
                setCurrentAvailableChannels(channels);
                setChannel(channels.length > 0 ? channels[0] : '');
            } else {
                setCurrentAvailableChannels([]);
                setChannel('');
            }
        }
    }, [selectedCampaignId, campaigns, isEditing]);

    const handleGenerate = async () => {
        if (!isEditing || !item) {
            alert("Please save the content item first before generating AI content.");
            return;
        }

        setIsGenerating(true);
        try {
            // Update brief first ensuring we have the latest context
            await api.updateContentItem(startupId, item.content_id, {
                content_brief: contentBrief
            });

            const result = await api.generateContentItem(startupId, item.content_id);
            if (result && result.content_body) {
                setContentBody(result.content_body);
                toast.success("Content generated successfully!");
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate content.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!isEditing && campaigns.length > 0 && !selectedCampaignId) {
            toast.error('Please select a campaign.');
            return;
        }
        if (!title.trim()) {
            toast.error('Please enter a content title.');
            return;
        }
        if (!publishDate) {
            toast.error('Please select a publish date.');
            return;
        }
        if (!channel) {
            toast.error('Please select a channel.');
            return;
        }

        setIsSaving(true);
        try {
            // Calculate Status
            let newStatus = status;

            // If already published, do not revert automatically
            if (status !== MarketingContentStatus.PUBLISHED) {
                // If content body is present, it's a Draft
                if (contentBody && contentBody.trim().length > 0) {
                    newStatus = MarketingContentStatus.DRAFT;
                } else {
                    newStatus = MarketingContentStatus.PLANNED;
                }
            }

            await onSave({
                title,
                content_type: contentType,
                channel,
                publish_date: publishDate,
                status: newStatus,
                content_brief: contentBrief,
                content_body: contentBody,
            }, selectedCampaignId || undefined);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save content.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Content Item' : 'Create Content Item'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row h-[80vh]">
                    {/* Left Column: Metadata & Brief */}
                    <div className="w-full md:w-1/2 p-6 space-y-4 overflow-y-auto border-r border-gray-100">

                        {/* Campaign Selector for Global Create Mode */}
                        {!isEditing && campaigns.length > 0 && (
                            <FormField label="Select Campaign *" id="content-campaign">
                                <select
                                    id="content-campaign"
                                    value={selectedCampaignId || ''}
                                    onChange={e => setSelectedCampaignId(Number(e.target.value))}
                                    required
                                    className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border"
                                >
                                    <option value="">-- Choose Campaign --</option>
                                    {campaigns.map(c => (
                                        <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
                                    ))}
                                </select>
                            </FormField>
                        )}

                        <FormField label="Content Title *" id="content-title">
                            <input type="text" id="content-title" value={title} onChange={e => setTitle(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border" />
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Content Type *" id="content-type">
                                <input type="text" id="content-type" value={contentType} onChange={e => setContentType(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border" placeholder="e.g., Blog Post" />
                            </FormField>
                            <FormField label="Channel *" id="content-channel">
                                <select
                                    id="content-channel"
                                    value={channel}
                                    onChange={e => setChannel(e.target.value)}
                                    required
                                    className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border"
                                    disabled={currentAvailableChannels.length === 0}
                                >
                                    <option value="" disabled>Select Channel</option>
                                    {currentAvailableChannels.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                {currentAvailableChannels.length === 0 && !isEditing && campaigns.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">Select a campaign to see channels</p>
                                )}
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Publish Date *" id="content-publish-date">
                                <input type="date" id="content-publish-date" value={publishDate} onChange={e => setPublishDate(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border" />
                            </FormField>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <FormField label="Content Strategy / Brief" id="content-brief">
                                <p className="text-xs text-gray-500 mb-1">Describe what this content should be about.</p>
                                <textarea id="content-brief" rows={6} value={contentBrief} onChange={e => setContentBrief(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm bg-blue-50 p-2 border" placeholder="Brief..." />
                            </FormField>
                        </div>
                    </div>

                    {/* Right Column: Final Content */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="content-body" className="block text-sm font-medium text-gray-700">Final Content</label>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="text-xs flex items-center gap-1 bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full shadow-sm hover:bg-purple-50 transition-colors"
                                >
                                    {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                                </button>
                            )}
                        </div>
                        <textarea
                            id="content-body"
                            className="flex-1 w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-3 font-mono text-sm leading-relaxed border"
                            placeholder="The final output will appear here..."
                            value={contentBody}
                            onChange={e => setContentBody(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">
                                {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Content')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContentItemModal;
