/**
 * @file EditBusinessOverviewModal.tsx
 * @description A modal component with a form for editing the business overview.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BusinessOverview } from '@/types/dashboard-types';

/**
 * Props for the EditBusinessOverviewModal component.
 * @interface EditBusinessOverviewModalProps
 */
interface EditBusinessOverviewModalProps {
    /** The current business overview data to pre-fill the form. */
    businessOverview: BusinessOverview;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated data.
     * @param {Partial<BusinessOverview>} updatedData - The updated business overview data.
     */
    onUpdate: (updatedData: Partial<BusinessOverview>) => void;
}

const EditBusinessOverviewModal: React.FC<EditBusinessOverviewModalProps> = ({ businessOverview, onClose, onUpdate }) => {
    // Form state
    const [businessModel, setBusinessModel] = useState('');
    const [keyPartners, setKeyPartners] = useState('');
    const [notes, setNotes] = useState('');

    /** Effect to pre-fill the form when the modal is opened. */
    useEffect(() => {
        if (businessOverview) {
            setBusinessModel(businessOverview.business_model || '');
            setKeyPartners(businessOverview.key_partners || '');
            setNotes(businessOverview.notes || '');
        }
    }, [businessOverview]);

    /**
     * Handles the form submission.
     * Packages the form state into an object and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({
            business_model: businessModel,
            key_partners: keyPartners,
            notes: notes,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Business Overview</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="business-model" className="block text-sm font-medium text-gray-700">Business Model</label>
                            <textarea id="business-model" value={businessModel} onChange={e => setBusinessModel(e.target.value)} rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div>
                            <label htmlFor="key-partners" className="block text-sm font-medium text-gray-700">Key Partners</label>
                            <textarea id="key-partners" value={keyPartners} onChange={e => setKeyPartners(e.target.value)} rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={6} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
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

export default EditBusinessOverviewModal;
