/**
 * @file CreateFeatureModal.tsx
 * @description A modal component with a form for creating a new product feature.
 * The form includes fields for the feature's name, description, and acceptance criteria.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Feature } from '../types';

/**
 * Props for the CreateFeatureModal component.
 * @interface CreateFeatureModalProps
 */
interface CreateFeatureModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new feature data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Feature, 'id' | 'product_id'>} featureData - The new feature data.
     */
    onCreate: (featureData: Omit<Feature, 'id' | 'product_id'>) => void;
}

const CreateFeatureModal: React.FC<CreateFeatureModalProps> = ({ onClose, onCreate }) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

    /**
     * Handles form submission.
     * It prevents the default form action, performs basic validation,
     * packages the state into a data object, and calls the `onCreate` prop.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return; // Simple validation
        onCreate({
            name,
            description,
            acceptance_criteria: acceptanceCriteria,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Add New Feature</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="feature-name" className="block text-sm font-medium text-gray-700">Feature Name</label>
                            <input type="text" id="feature-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="feature-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="feature-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div>
                            <label htmlFor="feature-acceptance-criteria" className="block text-sm font-medium text-gray-700">Acceptance Criteria</label>
                            <textarea id="feature-acceptance-criteria" value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Feature</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFeatureModal;