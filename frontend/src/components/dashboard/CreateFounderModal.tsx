/**
 * @file CreateFounderModal.tsx
 * @description A modal component with a form for creating a new founder or team member.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Founder } from '@/types/dashboard-types';

/**
 * Props for the CreateFounderModal component.
 * @interface CreateFounderModalProps
 */
interface CreateFounderModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new founder data.
     * @param {Omit<Founder, 'id' | 'startup_id'>} founderData - The new founder data for the backend.
     */
    onCreate: (founderData: Omit<Founder, 'id' | 'startup_id'>) => void;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const CreateFounderModal: React.FC<CreateFounderModalProps> = ({ onClose, onCreate }) => {
    // Form state
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [linkedinLink, setLinkedinLink] = useState('');

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !role || !email) return;

        onCreate({
            name,
            role,
            email,
            phone_number: phoneNumber || undefined,
            linkedin_link: linkedinLink || undefined,
        });
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Add New Founder</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Full Name" id="founder-name">
                                <input type="text" id="founder-name" value={name} onChange={e => setName(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                             <FormField label="Role" id="founder-role">
                                <input type="text" id="founder-role" value={role} onChange={e => setRole(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., CEO, CTO" />
                            </FormField>
                        </div>
                        <FormField label="Email" id="founder-email">
                            <input type="email" id="founder-email" value={email} onChange={e => setEmail(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Phone Number (Optional)" id="founder-phone">
                                <input type="tel" id="founder-phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                             <FormField label="LinkedIn Profile (Optional)" id="founder-linkedin">
                                <input type="url" id="founder-linkedin" value={linkedinLink} onChange={e => setLinkedinLink(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="https://..." />
                            </FormField>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Founder</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFounderModal;