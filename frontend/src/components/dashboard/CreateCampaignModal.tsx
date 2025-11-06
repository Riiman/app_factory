/**
 * @file CreateCampaignModal.tsx
 * @description A modal component with a form for creating a new marketing campaign.
 * It includes fields for essential campaign details and allows linking to a product.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MarketingCampaign, MarketingCampaignStatus, Product } from '../types';

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
    onCreate: (campaignData: Omit<MarketingCampaign, 'campaign_id' | 'startup_id' | 'created_by' | 'created_at' | 'content_calendar' | 'spend'>) => void;
    /** An array of products to populate the 'Link to Product' dropdown. */
    products: Product[];
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ onClose, onCreate, products }) => {
    // Form state
    const [campaignName, setCampaignName] = useState('');
    const [objective, setObjective] = useState('');
    const [channel, setChannel] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<MarketingCampaignStatus>(MarketingCampaignStatus.PLANNED);
    const [contentMode, setContentMode] = useState(false);
    const [productId, setProductId] = useState<string>('');

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignName) return;

        onCreate({
            campaign_name: campaignName,
            objective,
            channel,
            start_date: startDate,
            status,
            content_mode: contentMode,
            scope: productId ? 'product' : 'overall',
            product_id: productId ? parseInt(productId, 10) : undefined,
        });
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
                            <FormField label="Channel" id="campaign-channel">
                                <input type="text" id="campaign-channel" value={channel} onChange={e => setChannel(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Google Ads, Blog" />
                            </FormField>
                            <FormField label="Start Date" id="campaign-start-date">
                                <input type="date" id="campaign-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField label="Status" id="campaign-status">
                                <select id="campaign-status" value={status} onChange={e => setStatus(e.target.value as MarketingCampaignStatus)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    {Object.values(MarketingCampaignStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </FormField>
                             <FormField label="Link to Product (Optional)" id="campaign-product">
                                <select id="campaign-product" value={productId} onChange={e => setProductId(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    <option value="">None (Overall Campaign)</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </FormField>
                        </div>
                        <div className="flex items-center">
                            <input id="content-mode" type="checkbox" checked={contentMode} onChange={e => setContentMode(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
                            <label htmlFor="content-mode" className="ml-2 block text-sm text-gray-900">
                                This is a content-driven campaign (uses a Content Calendar)
                            </label>
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

export default CreateCampaignModal;