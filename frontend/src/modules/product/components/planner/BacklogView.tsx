import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Feature, FeatureStatus } from '@/types/dashboard-types';
import api from '@/utils/api';
import { Plus, MoreHorizontal, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BacklogViewProps {
    product: any; // Using any for Product to avoid strict type issues with nested existing types if partial
    onAddFeature: () => void;
    onEditFeature: (feature: Feature) => void;
}

const COLUMNS = {
    [FeatureStatus.BACKLOG]: { id: 'BACKLOG', title: 'Backlog', color: 'bg-gray-50 border-gray-200' },
    [FeatureStatus.PLANNED]: { id: 'PLANNED', title: 'Planned', color: 'bg-yellow-50 border-yellow-200' },
    [FeatureStatus.IN_PROGRESS]: { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
    [FeatureStatus.DONE]: { id: 'DONE', title: 'Done', color: 'bg-green-50 border-green-200' }
};

const getDeadlineStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Late by ${Math.abs(diffDays)} days`, color: 'text-red-600 bg-red-50', icon: true };
    if (diffDays === 0) return { text: 'Due Today', color: 'text-orange-600 bg-orange-50', icon: true };
    if (diffDays <= 3) return { text: `Due in ${diffDays} days`, color: 'text-yellow-600 bg-yellow-50', icon: true };
    return { text: target.toLocaleDateString(), color: 'text-gray-500', icon: false };
};

const BacklogView: React.FC<BacklogViewProps> = ({ product, onAddFeature, onEditFeature }) => {
    const queryClient = useQueryClient();

    // Fetch planner features
    const { data: features = [], isLoading } = useQuery({
        queryKey: ['planner_features', product.id],
        queryFn: () => api.getFeatures(product.id)
    });

    const updateFeatureMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updatePlannerFeature(id, { status }),
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['planner_features', product.id] });
            const previousFeatures = queryClient.getQueryData(['planner_features', product.id]);
            queryClient.setQueryData(['planner_features', product.id], (old: Feature[] | undefined) => {
                if (!old) return [];
                return old.map(feature =>
                    feature.id === id ? { ...feature, status: status as FeatureStatus } : feature
                );
            });
            return { previousFeatures };
        },
        onError: (_err, _newFeature, context: any) => {
            if (context?.previousFeatures) {
                queryClient.setQueryData(['planner_features', product.id], context.previousFeatures);
            }
            toast.error("Failed to update status");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['planner_features', product.id] });
            queryClient.invalidateQueries({ queryKey: ['products', product.startup_id] });
        }
    });

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        const newStatus = destination.droppableId as FeatureStatus;
        const featureId = parseInt(draggableId);

        // Optimistic UI update could go here, but for now relying on fast local mutation + invalidate
        updateFeatureMutation.mutate({ id: features.find((f: any) => f.id === featureId)?.id, status: newStatus });
    };

    if (isLoading) return <div className="p-4 flex items-center justify-center">Loading backlog...</div>;

    // Group features by status
    const columns: Record<string, Feature[]> = {
        BACKLOG: [],
        PLANNED: [],
        IN_PROGRESS: [],
        DONE: [] // DONE includes SHIPPED for display simplicity
    };

    features.forEach((f: Feature) => {
        let statusKey = f.status || 'BACKLOG';
        if (statusKey === 'PENDING') statusKey = 'BACKLOG'; // Map PENDING to BACKLOG
        if (statusKey === 'SHIPPED') statusKey = 'DONE';    // Map SHIPPED to DONE for board view
        if (statusKey === 'IN_REVIEW') statusKey = 'IN_PROGRESS'; // Map REVIEW to PROGRESS for now

        if (columns[statusKey]) {
            columns[statusKey].push(f);
        } else {
            // Fallback for unexpected statuses
            columns['BACKLOG'].push(f);
        }
    });

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-lg font-semibold text-gray-800">Kanban Board</h2>
                <div className="flex gap-2">
                    <button
                        onClick={onAddFeature}
                        className="flex items-center px-3 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={16} className="mr-1" /> Add Feature
                    </button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-1 gap-4 overflow-x-auto pb-4 h-full min-h-[500px]">
                    {Object.entries(COLUMNS).map(([statusId, colDef]) => (
                        <div key={statusId} className={`flex flex-col w-80 shrink-0 rounded-xl border ${colDef.color} h-full max-h-[calc(100vh-250px)]`}>
                            <div className="p-3 font-semibold text-gray-700 flex justify-between items-center sticky top-0 bg-inherit rounded-t-xl z-10 border-b border-gray-200/50">
                                {colDef.title}
                                <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">
                                    {columns[statusId]?.length || 0}
                                </span>
                            </div>

                            <Droppable droppableId={statusId}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 p-2 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent ${snapshot.isDraggingOver ? 'bg-white/50' : ''}`}
                                    >
                                        {columns[statusId]?.map((feature, index) => (
                                            <Draggable key={feature.id} draggableId={String(feature.id)} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => onEditFeature(feature)}
                                                        style={{ ...provided.draggableProps.style }}
                                                        className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 group hover:shadow-md transition-all ${snapshot.isDragging ? 'shadow-lg rotate-1 ring-1 ring-brand-primary z-50' : ''}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="text-sm font-medium text-gray-900 leading-tight line-clamp-2 pr-2">
                                                                {feature.name}
                                                            </div>
                                                            <div className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${feature.priority <= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                P{feature.priority}
                                                            </div>
                                                        </div>

                                                        {feature.description && (
                                                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                                                {feature.description}
                                                            </p>
                                                        )}

                                                        <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {/* Deadline Badge */}
                                                                {(() => {
                                                                    const status = getDeadlineStatus(feature.target_date);
                                                                    if (status) {
                                                                        return (
                                                                            <div className={`flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${status.color}`} title="Target Date">
                                                                                <Clock size={10} className="mr-1" />
                                                                                {status.text}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}

                                                                {/* RICE Score Badge */}
                                                                {feature.rice_score !== undefined && feature.rice_score !== null && (
                                                                    <div className="flex items-center text-[10px] font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded" title="RICE Score">
                                                                        RICE: {feature.rice_score}
                                                                    </div>
                                                                )}
                                                                {/* User Story Indicator */}
                                                                {feature.user_story && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300" title="Has User Story" />
                                                                )}
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                                                                    <MoreHorizontal size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default BacklogView;
