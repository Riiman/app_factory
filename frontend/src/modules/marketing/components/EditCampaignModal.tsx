/**
 * @file EditCampaignModal.tsx
 * @description A modal component with a form for editing an existing marketing campaign.
 * It pre-fills the form with current campaign details and allows updating various fields.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { MarketingCampaign, MarketingCampaignStatus, Product } from '@/types/dashboard-types';

/**
 * Props for the EditCampaignModal component.
 * @interface EditCampaignModalProps
 */
interface EditCampaignModalProps {
    /** The existing marketing campaign data to pre-fill the form. */
    campaign: MarketingCampaign;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated campaign data.
     * @param {Partial<MarketingCampaign>} updatedCampaignData - The updated campaign data for the backend.
     */
    onUpdate: (updatedCampaignData: Partial<MarketingCampaign>) => void;
    /** An array of products to populate the 'Link to Product' dropdown. */
    products: Product[];
}

const AVAILABLE_CHANNELS = [
    'LinkedIn',
    'Facebook',
    'Twitter / X',
    'Instagram',
    'YouTube',
    'Email / Newsletter',
    'Blog / SEO',
    'Google Ads'
];

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ campaign, onClose, onUpdate, products }) => {
    // Form state, initialized with existing campaign data
    const [campaignName, setCampaignName] = useState(campaign.campaign_name || '');
    const [objective, setObjective] = useState(campaign.objective || '');

    // Multi-select state
    const [selectedChannels, setSelectedChannels] = useState<string[]>(
        campaign.channel
            ? campaign.channel.split(',').map(s => s.trim()).filter(Boolean)
            : []
    );
    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
    const channelDropdownRef = React.useRef<HTMLDivElement>(null);

    const [startDate, setStartDate] = useState(campaign.start_date || '');
    const [endDate, setEndDate] = useState(campaign.end_date || '');
    const [status, setStatus] = useState<MarketingCampaignStatus>(campaign.status || MarketingCampaignStatus.PLANNED);
    const [contentMode, setContentMode] = useState(campaign.content_mode || false);
    const [productId, setProductId] = useState<string>(campaign.product_id?.toString() || '');
    const [notes, setNotes] = useState(campaign.notes || '');

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target as Node)) {
                setIsChannelDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleChannel = (channel: string) => {
        if (selectedChannels.includes(channel)) {
            setSelectedChannels(selectedChannels.filter(c => c !== channel));
        } else {
            setSelectedChannels([...selectedChannels, channel]);
        }
    };

    /**
     * Handles form submission, packages the data, and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for mandatory fields
        if (!campaignName.trim()) {
            alert('Please enter a campaign name.');
            return;
        }

        if (selectedChannels.length === 0) {
            alert('Please select at least one channel.');
            return;
        }
        if (!startDate) {
            alert('Please select a start date.');
            return;
        }

        onUpdate({
            campaign_name: campaignName,
            objective,
            channel: selectedChannels.join(', '),
            start_date: startDate,
            end_date: endDate || undefined,
            status,
            content_mode: contentMode,
            scope: productId ? 'product' : 'overall', // Adjust scope based on product linkage
            product_id: productId ? parseInt(productId, 10) : undefined,
            notes,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Campaign</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <FormField label="Campaign Name" id="edit-campaign-name">
                            <input type="text" id="edit-campaign-name" value={campaignName} onChange={e => setCampaignName(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <FormField label="Objective" id="edit-campaign-objective">
                            <textarea id="edit-campaign-objective" value={objective} onChange={e => setObjective(e.target.value)} rows={3} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Channels" id="edit-campaign-channel">
                                <div className="relative" ref={channelDropdownRef}>
                                    <button
                                        type="button"
                                        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                        onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                                    >
                                        <span className="block truncate">
                                            {selectedChannels.length > 0 ? selectedChannels.join(', ') : "Select channels..."}
                                        </span>
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                        </span>
                                    </button>

                                    {isChannelDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                            {AVAILABLE_CHANNELS.map((channel) => (
                                                <div
                                                    key={channel}
                                                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50 ${selectedChannels.includes(channel) ? 'text-brand-primary bg-blue-50' : 'text-gray-900'}`}
                                                    onClick={() => toggleChannel(channel)}
                                                >
                                                    <span className={`block truncate ${selectedChannels.includes(channel) ? 'font-semibold' : 'font-normal'}`}>
                                                        {channel}
                                                    </span>
                                                    {selectedChannels.includes(channel) && (
                                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-brand-primary">
                                                            <Check className="h-4 w-4" aria-hidden="true" />
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormField>
                            <FormField label="Start Date" id="edit-campaign-start-date">
                                <input type="date" id="edit-campaign-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="End Date" id="edit-campaign-end-date">
                                <input type="date" id="edit-campaign-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                            <FormField label="Status" id="edit-campaign-status">
                                <select id="edit-campaign-status" value={status} onChange={e => setStatus(e.target.value as MarketingCampaignStatus)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    {Object.values(MarketingCampaignStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </FormField>
                        </div>
                        <FormField label="Notes" id="edit-campaign-notes">
                            <textarea id="edit-campaign-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <div className="flex items-center">
                            <input id="edit-content-mode" type="checkbox" checked={contentMode} onChange={e => setContentMode(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
                            <label htmlFor="edit-content-mode" className="ml-2 block text-sm text-gray-900">
                                This is a content-driven campaign (uses a Content Calendar)
                            </label>
                        </div>
                        <FormField label="Link to Product (Optional)" id="edit-campaign-product">
                            <select id="edit-campaign-product" value={productId} onChange={e => setProductId(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                <option value="">None (Overall Campaign)</option>
                                {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </FormField>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

export default EditCampaignModal;
