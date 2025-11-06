/**
 * @file CreateInvestorModal.tsx
 * @description A modal component with a form for creating a new investor in the CRM.
 * It includes fields for all essential investor details.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Investor } from '../types';

type InvestorType = 'Angel' | 'VC' | 'Fund' | 'Accelerator';

/**
 * Props for the CreateInvestorModal component.
 * @interface CreateInvestorModalProps
 */
interface CreateInvestorModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new investor data.
     * @param {Omit<Investor, 'investor_id' | 'created_at'>} investorData - The new investor data for the backend.
     */
    onCreate: (investorData: Omit<Investor, 'investor_id' | 'created_at'>) => void;
}

const CreateInvestorModal: React.FC<CreateInvestorModalProps> = ({ onClose, onCreate }) => {
    // Form state
    const [name, setName] = useState('');
    const [firmName, setFirmName] = useState('');
    const [type, setType] = useState<InvestorType>('VC');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [notes, setNotes] = useState('');

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        onCreate({
            name,
            firm_name: firmName || undefined,
            type,
            email: email || undefined,
            website: website || undefined,
            notes: notes || undefined,
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
                    <h2 className="text-xl font-bold text-gray-900">Add New Investor</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Name" id="investor-name">
                                <input type="text" id="investor-name" value={name} onChange={e => setName(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                             <FormField label="Firm Name" id="investor-firm">
                                <input type="text" id="investor-firm" value={firmName} onChange={e => setFirmName(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField label="Type" id="investor-type">
                                <select id="investor-type" value={type} onChange={e => setType(e.target.value as InvestorType)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    <option>Angel</option>
                                    <option>VC</option>
                                    <option>Fund</option>
                                    <option>Accelerator</option>
                                </select>
                            </FormField>
                             <FormField label="Email" id="investor-email">
                                <input type="email" id="investor-email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                        <FormField label="Website" id="investor-website">
                            <input type="url" id="investor-website" value={website} onChange={e => setWebsite(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="https://..." />
                        </FormField>
                        <FormField label="Notes" id="investor-notes">
                            <textarea id="investor-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Investor</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateInvestorModal;