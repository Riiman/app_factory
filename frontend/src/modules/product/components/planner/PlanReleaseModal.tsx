import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, Release, Feature } from '@/types/dashboard-types';
import api from '@/utils/api';
import { X, ArrowRight, ArrowLeft, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlanReleaseModalProps {
    product: Product;
    release: Release;
    onClose: () => void;
}

const PlanReleaseModal: React.FC<PlanReleaseModalProps> = ({ product, release, onClose }) => {
    const queryClient = useQueryClient();

    const { data: features = [], isLoading } = useQuery({
        queryKey: ['planner_features', product.id],
        queryFn: () => api.getFeatures(product.id)
    });

    const updateFeatureMutation = useMutation({
        mutationFn: ({ id, release_id }: { id: number; release_id: number | null }) =>
            api.updatePlannerFeature(id, { release_id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planner_features', product.id] });
        },
        onError: () => toast.error('Failed to update release')
    });

    // Features not in THIS release (and preferably not in another release? For now assume 1 release per feature?)
    // Yes, model has single release_id.
    const availableFeatures = features.filter((f: Feature) => f.release_id !== release.id && !f.release_id);
    const releaseFeatures = features.filter((f: Feature) => f.release_id === release.id);

    const addToRelease = (feature: Feature) => {
        updateFeatureMutation.mutate({
            id: feature.id,
            release_id: release.id
        });
    };

    const removeFromRelease = (feature: Feature) => {
        updateFeatureMutation.mutate({
            id: feature.id,
            release_id: null
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">Plan Release: {release.version}</h2>
                            <p className="text-sm text-gray-500">Target: {new Date(release.target_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex divide-x divide-gray-100 bg-gray-50">

                    {/* Available Features Pane */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                            Unreleased Features
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{availableFeatures.length}</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {availableFeatures.map((f: Feature) => (
                                <div key={f.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-brand-primary/50 transition-colors group flex justify-between items-center">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{f.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded ${f.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                                {f.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => addToRelease(f)}
                                        className="p-1.5 rounded bg-gray-100 text-gray-400 hover:bg-brand-primary hover:text-white transition-colors"
                                        title="Add to Release"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                            {availableFeatures.length === 0 && <p className="text-sm text-gray-400 italic text-center py-8">No available features found</p>}
                        </div>
                    </div>

                    {/* Release Cart Pane */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden bg-white">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                            In this Release
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{releaseFeatures.length}</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {releaseFeatures.map((f: Feature) => (
                                <div key={f.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm hover:border-red-300 transition-colors group flex justify-between items-center">
                                    <button
                                        onClick={() => removeFromRelease(f)}
                                        className="p-1.5 rounded bg-white border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors mr-3"
                                        title="Remove from Release"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{f.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded ${f.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                                {f.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {releaseFeatures.length === 0 && (
                                <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-400 text-sm italic">
                                    Release is empty. Add features from the left.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Done</button>
                </div>
            </div>
        </div>
    );
};

export default PlanReleaseModal;
