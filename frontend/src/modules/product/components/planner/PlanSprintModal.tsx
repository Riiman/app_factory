import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, Sprint, Feature } from '@/types/dashboard-types';
import api from '@/utils/api';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlanSprintModalProps {
    product: Product;
    sprint: Sprint;
    onClose: () => void;
}

const PlanSprintModal: React.FC<PlanSprintModalProps> = ({ product, sprint, onClose }) => {
    const queryClient = useQueryClient();

    const { data: features = [], isLoading } = useQuery({
        queryKey: ['planner_features', product.id],
        queryFn: () => api.getFeatures(product.id)
    });

    const updateFeatureMutation = useMutation({
        mutationFn: ({ id, sprint_id, status }: { id: number; sprint_id: number | null, status?: string }) =>
            api.updatePlannerFeature(id, { sprint_id, status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planner_features', product.id] });
        },
        onError: () => toast.error('Failed to move feature')
    });

    const backlogFeatures = features.filter((f: Feature) => !f.sprint_id && f.status !== 'DONE' && f.status !== 'SHIPPED');
    const sprintFeatures = features.filter((f: Feature) => f.sprint_id === sprint.id);

    const moveToSprint = (feature: Feature) => {
        updateFeatureMutation.mutate({
            id: feature.id,
            sprint_id: sprint.id,
            status: feature.status === 'BACKLOG' ? 'PLANNED' : feature.status // Auto-update status to PLANNED if BACKLOG
        });
    };

    const removeFromSprint = (feature: Feature) => {
        updateFeatureMutation.mutate({
            id: feature.id,
            sprint_id: null,
            status: 'BACKLOG' // Reset to BACKLOG
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Plan Sprint: {sprint.name}</h2>
                        <p className="text-sm text-gray-500">{new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex divide-x divide-gray-100 bg-gray-50">

                    {/* Backlog Pane */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                            Backlog
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{backlogFeatures.length}</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {backlogFeatures.map((f: Feature) => (
                                <div key={f.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-brand-primary/50 transition-colors group flex justify-between items-center">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{f.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded ${f.priority <= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-100'}`}>P{f.priority}</span>
                                            {f.rice_score && <span className="text-purple-600">RICE: {f.rice_score}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => moveToSprint(f)}
                                        className="p-1.5 rounded bg-gray-100 text-gray-400 hover:bg-brand-primary hover:text-white transition-colors"
                                        title="Move to Sprint"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                            {backlogFeatures.length === 0 && <p className="text-sm text-gray-400 italic text-center py-8">Backlog is empty</p>}
                        </div>
                    </div>

                    {/* Sprint Pane */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden bg-white">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                            Sprint Backlog
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{sprintFeatures.length}</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {sprintFeatures.map((f: Feature) => (
                                <div key={f.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm hover:border-red-300 transition-colors group flex justify-between items-center">
                                    <button
                                        onClick={() => removeFromSprint(f)}
                                        className="p-1.5 rounded bg-white border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors mr-3"
                                        title="Remove from Sprint"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{f.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded ${f.priority <= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-100'}`}>P{f.priority}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {sprintFeatures.length === 0 && (
                                <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-400 text-sm italic">
                                    Drop items here or click arrow on backlog items
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

export default PlanSprintModal;
