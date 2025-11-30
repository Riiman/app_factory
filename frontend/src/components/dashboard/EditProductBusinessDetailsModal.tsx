/**
 * @file EditProductBusinessDetailsModal.tsx
 * @description A modal component with a form for editing the business details of a product.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProductBusinessDetails } from '@/types/dashboard-types';

/**
 * Props for the EditProductBusinessDetailsModal component.
 * @interface EditProductBusinessDetailsModalProps
 */
interface EditProductBusinessDetailsModalProps {
    /** The current product business details data to pre-fill the form. */
    productBusinessDetails: ProductBusinessDetails;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated data.
     * @param {Partial<ProductBusinessDetails>} updatedData - The updated product business details data.
     */
    onUpdate: (updatedData: Partial<ProductBusinessDetails>) => void;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const EditProductBusinessDetailsModal: React.FC<EditProductBusinessDetailsModalProps> = ({ productBusinessDetails, onClose, onUpdate }) => {
    // Form state
    const [pricingModel, setPricingModel] = useState('');
    const [targetCustomer, setTargetCustomer] = useState('');
    const [revenueStreams, setRevenueStreams] = useState('');
    const [distributionChannels, setDistributionChannels] = useState('');
    const [costStructure, setCostStructure] = useState('');

    /** Effect to pre-fill the form when the modal is opened. */
    useEffect(() => {
        if (productBusinessDetails) {
            setPricingModel(productBusinessDetails.pricing_model || '');
            setTargetCustomer(productBusinessDetails.target_customer || '');
            setRevenueStreams(productBusinessDetails.revenue_streams || '');
            setDistributionChannels(productBusinessDetails.distribution_channels || '');
            setCostStructure(productBusinessDetails.cost_structure || '');
        }
    }, [productBusinessDetails]);

    /**
     * Handles the form submission.
     * Packages the form state into an object and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({
            pricing_model: pricingModel,
            target_customer: targetCustomer,
            revenue_streams: revenueStreams,
            distribution_channels: distributionChannels,
            cost_structure: costStructure,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Product Business Details</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <FormField label="Pricing Model" id="pricing-model">
                            <input type="text" id="pricing-model" value={pricingModel} onChange={e => setPricingModel(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <FormField label="Target Customer" id="target-customer">
                            <textarea id="target-customer" value={targetCustomer} onChange={e => setTargetCustomer(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <FormField label="Revenue Streams" id="revenue-streams">
                            <textarea id="revenue-streams" value={revenueStreams} onChange={e => setRevenueStreams(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <FormField label="Distribution Channels" id="distribution-channels">
                            <textarea id="distribution-channels" value={distributionChannels} onChange={e => setDistributionChannels(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <FormField label="Cost Structure" id="cost-structure">
                            <textarea id="cost-structure" value={costStructure} onChange={e => setCostStructure(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
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

export default EditProductBusinessDetailsModal;
