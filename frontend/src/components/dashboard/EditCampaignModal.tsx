/**
 * @file EditCampaignModal.tsx
 * @description A modal component with a form for editing an existing marketing campaign.
 * It pre-fills the form with current campaign details and allows updating various fields.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ campaign, onClose, onUpdate, products }) => {
    // Form state, initialized with existing campaign data
    const [campaignName, setCampaignName] = useState(campaign.campaign_name || '');
    const [objective, setObjective] = useState(campaign.objective || '');
    const [channel, setChannel] = useState(campaign.channel || '');
    const [startDate, setStartDate] = useState(campaign.start_date || '');
    const [endDate, setEndDate] = useState(campaign.end_date || '');
    const [status, setStatus] = useState<MarketingCampaignStatus>(campaign.status || MarketingCampaignStatus.PLANNED);
    const [contentMode, setContentMode] = useState(campaign.content_mode || false);
    const [productId, setProductId] = useState<string>(campaign.product_id?.toString() || '');
    const [notes, setNotes] = useState(campaign.notes || '');

    /**
     * Handles form submission, packages the data, and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignName) return;

        onUpdate({
            campaign_name: campaignName,
            objective,
            channel,
            start_date: startDate,
            end_date: endDate,
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
                            <FormField label="Channel" id="edit-campaign-channel">
                                <input type="text" id="edit-campaign-channel" value={channel} onChange={e => setChannel(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Google Ads, Blog" />
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
