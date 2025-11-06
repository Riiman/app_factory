/**
 * @file CreateExperimentModal.tsx
 * @description A modal component with a form for creating a new experiment.
 * It includes fields for the experiment's name, hypothesis, validation method, and linking.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Experiment, Scope, LinkedEntityType } from '../types';

type LinkableItem = { id: number; name: string };

/**
 * Props for the CreateExperimentModal component.
 * @interface CreateExperimentModalProps
 */
interface CreateExperimentModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new experiment data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Experiment, 'id' | 'startup_id' | 'created_at' | 'status'>} experimentData - The new experiment data for the backend.
     */
    onCreate: (experimentData: Omit<Experiment, 'id' | 'startup_id' | 'created_at' | 'status'>) => void;
    /** An object containing lists of items that the experiment can be linked to, keyed by scope. */
    linkableItems: Record<Scope, LinkableItem[]>;
}

const CreateExperimentModal: React.FC<CreateExperimentModalProps> = ({ onClose, onCreate, linkableItems }) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [assumption, setAssumption] = useState('');
    const [validationMethod, setValidationMethod] = useState('');
    const [scope, setScope] = useState<Scope>(Scope.PRODUCT);
    const [linkedToId, setLinkedToId] = useState<string>('');
    const [availableLinks, setAvailableLinks] = useState<LinkableItem[]>([]);

    /** Effect to update linkable items when scope changes. */
     useEffect(() => {
        setLinkedToId('');
        setAvailableLinks(linkableItems[scope] || []);
    }, [scope, linkableItems]);

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !assumption || !validationMethod) return;

        let linked_to_type: LinkedEntityType | undefined;
        switch (scope) {
            case Scope.PRODUCT: linked_to_type = 'Product'; break;
            case Scope.FUNDRAISING: linked_to_type = 'FundingRound'; break;
            case Scope.MARKETING: linked_to_type = 'MarketingCampaign'; break;
            default: linked_to_type = undefined;
        }

        onCreate({
            name,
            description,
            assumption,
            validation_method: validationMethod,
            scope,
            linked_to_id: linkedToId ? parseInt(linkedToId, 10) : undefined,
            linked_to_type,
        });
    };

    const scopeOptions = [Scope.PRODUCT, Scope.MARKETING, Scope.FUNDRAISING, Scope.GENERAL];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Experiment</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="exp-name" className="block text-sm font-medium text-gray-700">Experiment Name</label>
                            <input type="text" id="exp-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                         <div>
                            <label htmlFor="exp-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="exp-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div>
                            <label htmlFor="exp-assumption" className="block text-sm font-medium text-gray-700">Assumption / Hypothesis</label>
                            <textarea id="exp-assumption" value={assumption} onChange={e => setAssumption(e.target.value)} required rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div>
                            <label htmlFor="exp-validation" className="block text-sm font-medium text-gray-700">Validation Method</label>
                            <textarea id="exp-validation" value={validationMethod} onChange={e => setValidationMethod(e.target.value)} required rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="exp-scope" className="block text-sm font-medium text-gray-700">Scope</label>
                                <select id="exp-scope" value={scope} onChange={e => setScope(e.target.value as Scope)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {scopeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="exp-linked-to" className="block text-sm font-medium text-gray-700">Link To</label>
                                <select id="exp-linked-to" value={linkedToId} onChange={e => setLinkedToId(e.target.value)} disabled={scope === Scope.GENERAL} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm disabled:bg-gray-100">
                                    <option value="">{scope === Scope.GENERAL ? 'N/A' : `Select ${scope}...`}</option>
                                    {availableLinks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Create Experiment</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateExperimentModal;