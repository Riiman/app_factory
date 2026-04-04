import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Check } from 'lucide-react';
import api from '@/utils/api';
import { Feature } from '@/types/dashboard-types';

interface CreateReleaseModalProps {
    productId: number;
    onClose: () => void;
    onCreate: (data: any) => void;
}

const CreateReleaseModal: React.FC<CreateReleaseModalProps> = ({ productId, onClose, onCreate }) => {
    const [version, setVersion] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch unreleased features
    const { data: features = [] } = useQuery({
        queryKey: ['planner_features', productId],
        queryFn: () => api.getFeatures(productId),
        enabled: !!productId
    });

    const unreleasedFeatures = features.filter((f: Feature) => !f.release_id);

    const toggleFeature = (id: number) => {
        if (selectedFeatureIds.includes(id)) {
            setSelectedFeatureIds(selectedFeatureIds.filter(fid => fid !== id));
        } else {
            setSelectedFeatureIds([...selectedFeatureIds, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!version || !targetDate) {
            alert("Version and Target Date are required");
            return;
        }

        setIsLoading(true);
        try {
            await onCreate({
                version,
                name,
                description,
                target_date: targetDate,
                status: 'PLANNED',
                feature_ids: selectedFeatureIds
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">New Release</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                                <input
                                    type="text"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="e.g. v1.2.0"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Release Name (Optional)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="e.g. Summer Update"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="What's included in this release?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    required
                                />
                            </div>
                        </div>

                        {/* Feature Selection */}
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Add Features to Release</label>
                                <span className="text-xs text-gray-500">{selectedFeatureIds.length} selected</span>
                            </div>

                            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                                {unreleasedFeatures.length > 0 ? unreleasedFeatures.map((f: Feature) => (
                                    <div
                                        key={f.id}
                                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${selectedFeatureIds.includes(f.id) ? 'bg-purple-50/50' : ''}`}
                                        onClick={() => toggleFeature(f.id)}
                                    >
                                        <div className="flex-1 min-w-0 pr-3">
                                            <div className="font-medium text-sm text-gray-900 truncate">{f.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${f.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {f.status?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedFeatureIds.includes(f.id)
                                                ? 'bg-brand-primary border-brand-primary text-white'
                                                : 'border-gray-300 text-transparent'
                                            }`}>
                                            <Check size={12} />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-sm text-gray-400 italic">
                                        No unreleased features available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-secondary disabled:opacity-50"
                        >
                            {isLoading ? 'Creating...' : 'Create Release'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateReleaseModal;
