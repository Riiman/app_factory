import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Feature, FeatureStatus } from '@/types/dashboard-types';

interface EditFeatureModalProps {
    feature: Feature;
    onClose: () => void;
    onUpdate: (updatedData: Partial<Feature>) => void;
}

const EditFeatureModal: React.FC<EditFeatureModalProps> = ({ feature, onClose, onUpdate }) => {
    const [name, setName] = useState(feature.name);
    const [description, setDescription] = useState(feature.description || '');
    const [acceptanceCriteria, setAcceptanceCriteria] = useState(feature.acceptance_criteria || '');
    const [status, setStatus] = useState<FeatureStatus>(feature.status || FeatureStatus.PENDING);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setName(feature.name);
        setDescription(feature.description || '');
        setAcceptanceCriteria(feature.acceptance_criteria || '');
        setStatus(feature.status || FeatureStatus.PENDING);
    }, [feature]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onUpdate({
                name,
                description,
                acceptance_criteria: acceptanceCriteria,
                status
            });
            onClose();
        } catch (error) {
            console.error("Failed to update feature:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Feature</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as FeatureStatus)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                            >
                                {Object.values(FeatureStatus).map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Criteria</label>
                            <textarea
                                value={acceptanceCriteria}
                                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                placeholder="- User can click button..."
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditFeatureModal;
