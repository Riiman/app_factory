/**
 * @file CreateCampaignModal.tsx
 * @description A modal component with a form for creating a new marketing campaign.
 * It includes fields for essential campaign details and allows linking to a product.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { MarketingCampaign, MarketingCampaignStatus, Product } from '@/types/dashboard-types';

/**
 * Props for the CreateCampaignModal component.
 * @interface CreateCampaignModalProps
 */
interface CreateCampaignModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new campaign data.
     * @param {Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar'>} campaignData - The new campaign data for the backend.
     */
    onCreate: (campaignData: Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar' | 'spend'> & { auto_generate_content?: boolean }) => void;
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

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ onClose, onCreate, products }) => {
    // Form state
    const [campaignName, setCampaignName] = useState('');
    const [objective, setObjective] = useState('');

    // Multi-select state
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
    const channelDropdownRef = useRef<HTMLDivElement>(null);

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    // Status is always PLANNED for new campaigns
    const [contentMode, setContentMode] = useState(false);
    const [productId, setProductId] = useState<string>('');

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
    }, [channelDropdownRef]);

    const toggleChannel = (channel: string) => {
        if (selectedChannels.includes(channel)) {
            setSelectedChannels(selectedChannels.filter(c => c !== channel));
        } else {
            setSelectedChannels([...selectedChannels, channel]);
        }
    };

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
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

        onCreate({
            campaign_name: campaignName,
            objective,
            channel: selectedChannels.join(', '), // Join array to string for backend compatibility
            start_date: startDate,
            status: MarketingCampaignStatus.PLANNED, // Always PLANNED for new campaigns
            content_mode: contentMode,
            auto_generate_content: contentMode, // Trigger AI generation if checked
            scope: productId ? 'product' : 'overall',
            product_id: productId ? parseInt(productId, 10) : undefined,
            content_calendars: [], // Initialize with empty calendar list
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Campaign</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <FormField label="Campaign Name" id="campaign-name">
                            <input type="text" id="campaign-name" value={campaignName} onChange={e => setCampaignName(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <FormField label="Objective" id="campaign-objective">
                            <textarea id="campaign-objective" value={objective} onChange={e => setObjective(e.target.value)} rows={3} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Channels" id="campaign-channel">
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
                            <FormField label="Start Date" id="campaign-start-date">
                                <input type="date" id="campaign-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <FormField label="Link to Product (Optional)" id="campaign-product">
                                <select id="campaign-product" value={productId} onChange={e => setProductId(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    <option value="">None (Overall Campaign)</option>
                                    {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </FormField>
                            <div className="flex items-center pb-2">
                                <input id="content-mode" type="checkbox" checked={contentMode} onChange={e => setContentMode(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
                                <label htmlFor="content-mode" className="ml-2 block text-sm text-gray-900">
                                    Generate content calendar
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Create Campaign</button>
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

export default CreateCampaignModal;