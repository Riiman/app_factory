/**
 * @file CreateArtifactModal.tsx
 * @description A modal component with a form for creating a new artifact (File, Link, or Text).
 * The form dynamically changes the input field for the artifact's location based on its type.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Artifact, ArtifactType, Scope, LinkedEntityType } from '@/types/dashboard-types';

type LinkableItem = { id: number; name: string };

/**
 * Props for the CreateArtifactModal component.
 * @interface CreateArtifactModalProps
 */
interface CreateArtifactModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new artifact data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Artifact, 'id' | 'startup_id' | 'created_at'>} artifactData - The new artifact data for the backend.
     */
    onCreate: (artifactData: Omit<Artifact, 'id' | 'startup_id' | 'created_at'>) => void;
    /** An object containing lists of items that the artifact can be linked to, keyed by scope. */
    linkableItems: Record<Scope, LinkableItem[]>;
}

const CreateArtifactModal: React.FC<CreateArtifactModalProps> = ({ onClose, onCreate, linkableItems }) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ArtifactType>(ArtifactType.LINK);
    const [location, setLocation] = useState('');
    const [scope, setScope] = useState<Scope>(Scope.GENERAL);
    const [linkedToId, setLinkedToId] = useState<string>('');
    const [availableLinks, setAvailableLinks] = useState<LinkableItem[]>([]);

    /** Effect to update linkable items when scope changes. */
    useEffect(() => {
        setLinkedToId('');
        if (scope === Scope.GENERAL) {
            setAvailableLinks([]);
        } else {
            setAvailableLinks(linkableItems[scope] || []);
        }
    }, [scope, linkableItems]);

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !location) return;

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
            type,
            location,
            scope,
            linked_to_id: linkedToId ? parseInt(linkedToId, 10) : undefined,
            linked_to_type,
        });
    };
    
    const scopeOptions = [Scope.GENERAL, Scope.PRODUCT, Scope.FUNDRAISING, Scope.MARKETING];

    /** Renders the correct input field based on the selected artifact type. */
    const renderLocationInput = () => {
        switch (type) {
            case ArtifactType.LINK:
                return <input type="url" placeholder="https://..." value={location} onChange={e => setLocation(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />;
            case ArtifactType.TEXT:
                return <textarea value={location} onChange={e => setLocation(e.target.value)} required rows={5} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>;
            case ArtifactType.FILE:
                return <input type="text" placeholder="/path/to/file.pdf" value={location} onChange={e => setLocation(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Artifact</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Artifact Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type</label>
                                <select value={type} onChange={e => setType(e.target.value as ArtifactType)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {Object.values(ArtifactType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">{type === 'TEXT' ? 'Content' : 'Location'}</label>
                                {renderLocationInput()}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Scope</label>
                                <select value={scope} onChange={e => setScope(e.target.value as Scope)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {scopeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Link To</label>
                                <select value={linkedToId} onChange={e => setLinkedToId(e.target.value)} disabled={scope === Scope.GENERAL} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm disabled:bg-gray-100">
                                    <option value="">{scope === Scope.GENERAL ? 'N/A' : `Select ${scope}...`}</option>
                                    {availableLinks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Create Artifact</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateArtifactModal;