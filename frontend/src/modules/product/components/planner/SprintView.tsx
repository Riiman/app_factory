import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, Sprint } from '@/types/dashboard-types';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Plus, Play, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateSprintModal from '../CreateSprintModal';
import PlanSprintModal from './PlanSprintModal';

interface SprintViewProps {
    product: Product;
}

const SprintView: React.FC<SprintViewProps> = ({ product }) => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [planningSprint, setPlanningSprint] = useState<Sprint | null>(null);

    const { data: sprints = [], isLoading } = useQuery({
        queryKey: ['sprints', product.id],
        queryFn: () => api.getSprints(product.id)
    });

    // Mutations
    const createSprintMutation = useMutation({
        mutationFn: (data: any) => api.createSprint(product.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', product.id] });
            toast.success('Sprint created');
        },
        onError: () => toast.error('Failed to create sprint')
    });

    const startSprintMutation = useMutation({
        mutationFn: (id: number) => api.startSprint(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', product.id] });
            // Also invalidate features as they might move/change state conceptually? No, just sprint status.
            toast.success('Sprint started 🚀');
        },
        onError: () => toast.error('Failed to start sprint')
    });

    const completeSprintMutation = useMutation({
        mutationFn: (id: number) => api.completeSprint(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', product.id] });
            queryClient.invalidateQueries({ queryKey: ['planner_features', product.id] }); // Backlog updates
            toast.success('Sprint completed! 🎉');
        },
        onError: () => toast.error('Failed to complete sprint')
    });


    if (isLoading) return <div>Loading sprints...</div>;

    const activeSprint = sprints.find((s: any) => s.status === 'ACTIVE');
    const futureSprints = sprints.filter((s: any) => s.status === 'PLANNING');
    const completedSprints = sprints.filter((s: any) => s.status === 'COMPLETED').reverse(); // Newest first

    return (
        <div className="space-y-8 pb-10">
            {/* Header / Actions */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Sprint Board</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-primary/90 transition-all font-medium text-sm"
                >
                    <Plus size={18} className="mr-2" /> Create Sprint
                </button>
            </div>

            {/* Active Sprint Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Play size={20} className="text-green-500 mr-2 fill-green-100" /> Active Sprint
                </h3>
                {activeSprint ? (
                    <div className="bg-white rounded-xl border border-green-200 shadow-md p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Play size={100} className="text-green-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-900">{activeSprint.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                                        <Calendar size={14} className="mr-1" />
                                        {new Date(activeSprint.start_date).toLocaleDateString()} - {new Date(activeSprint.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Complete this sprint? Incomplete items will be moved to backlog.')) {
                                            completeSprintMutation.mutate(activeSprint.id);
                                        }
                                    }}
                                    className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 font-medium text-sm transition-colors shadow-sm"
                                >
                                    Complete Sprint
                                </button>
                            </div>

                            <div className="bg-green-50/50 rounded-lg p-4 border border-green-100 mb-6 max-w-2xl">
                                <h5 className="text-xs font-bold text-green-800 uppercase mb-1">Sprint Goal</h5>
                                <p className="text-gray-700 italic">{activeSprint.goal || 'No goal set for this sprint.'}</p>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setPlanningSprint(activeSprint)} className="text-sm text-brand-primary hover:underline flex items-center">
                                    Manage Items <ArrowRight size={14} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <p className="text-gray-500 mb-2">No active sprint currently running.</p>
                        <p className="text-sm text-gray-400">Start a sprint from the "Planned Sprints" list below.</p>
                    </div>
                )}
            </div>

            {/* Future Sprints */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Planned Sprints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {futureSprints.length > 0 ? futureSprints.map((sprint: any) => (
                        <Card key={sprint.id} title={sprint.name}>
                            <div className="flex flex-col h-full">
                                <div className="text-xs text-gray-500 mb-2 flex items-center">
                                    <Calendar size={12} className="mr-1" />
                                    {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                                </div>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5em]">
                                    {sprint.goal || 'No goal set'}
                                </p>
                                <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <button
                                        onClick={() => setPlanningSprint(sprint)}
                                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 font-medium transition-colors"
                                    >
                                        Plan Sprint
                                    </button>
                                    {!activeSprint && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Start ${sprint.name}?`)) {
                                                    startSprintMutation.mutate(sprint.id);
                                                }
                                            }}
                                            className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 font-medium transition-colors flex items-center"
                                        >
                                            <Play size={10} className="mr-1" /> Start
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <div className="col-span-full py-8 text-center text-gray-400 text-sm italic bg-gray-50 rounded-lg">
                            No future sprints planned. Create one to get started.
                        </div>
                    )}
                </div>
            </div>

            {/* Completed Sprints (Collapsible or just list) */}
            {completedSprints.length > 0 && (
                <div className="pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center opacity-75">
                        <CheckCircle size={18} className="mr-2 text-gray-400" /> Completed Sprints
                    </h3>
                    <div className="space-y-2 opacity-75 grayscale hover:grayscale-0 transition-all">
                        {completedSprints.map((sprint: any) => (
                            <div key={sprint.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div>
                                    <span className="font-medium text-gray-700 mr-3">{sprint.name}</span>
                                    <span className="text-xs text-gray-500">{new Date(sprint.end_date).toLocaleDateString()}</span>
                                </div>
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Completed</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {isCreateModalOpen && (
                <CreateSprintModal
                    productId={product.id}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={createSprintMutation.mutate}
                />
            )}

            {planningSprint && (
                <PlanSprintModal
                    product={product}
                    sprint={planningSprint}
                    onClose={() => setPlanningSprint(null)}
                />
            )}
        </div>
    );
};

export default SprintView;
