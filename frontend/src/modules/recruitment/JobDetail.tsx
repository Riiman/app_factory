import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import api from '@/utils/api';
import { Job, Application, ApplicationStatus } from '@/types/dashboard-types';
import { ArrowLeft, Plus, Calendar, Star, FileText, MoreVertical, XCircle, AlertTriangle } from 'lucide-react';
import AddCandidateModal from './AddCandidateModal';
import CandidateReview from './CandidateReview';
import { toast } from 'react-hot-toast';

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

interface JobDetailProps {
    startupId: number;
    jobId: number;
    onBack: () => void;
    initialApplicationId?: number | null;
}

// Color mapping for match score
const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 border-green-200 bg-green-50';
    if (score >= 75) return 'text-blue-600 border-blue-200 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-red-500 border-red-200 bg-red-50';
};

const JobDetail: React.FC<JobDetailProps> = ({ startupId, jobId, onBack, initialApplicationId }) => {
    const queryClient = useQueryClient();
    const [pipelineData, setPipelineData] = useState<Record<string, Application[]>>({});
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const [isClosingJob, setIsClosingJob] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(initialApplicationId || null);

    const { data: job, isLoading: isJobLoading } = useQuery({
        queryKey: ['job', jobId],
        queryFn: () => api.getJobDetail(Number(jobId)),
        enabled: !!jobId,
    });

    const { data: pipeline, isLoading: isPipelineLoading } = useQuery({
        queryKey: ['job-pipeline', jobId],
        queryFn: () => api.getJobPipeline(Number(jobId)),
        enabled: !!jobId,
    });

    useEffect(() => {
        if (pipeline) {
            setPipelineData(pipeline);
        }
    }, [pipeline]);

    useEffect(() => {
        if (initialApplicationId) {
            setSelectedApplicationId(initialApplicationId);
        }
    }, [initialApplicationId]);

    const moveMutation = useMutation({
        mutationFn: ({ appId, stage }: { appId: number; stage: string }) =>
            api.moveApplication(appId, stage),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-pipeline', jobId] });
        }
    });

    const closeJobMutation = useMutation({
        mutationFn: () => api.closeJob(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job', jobId] });
            queryClient.invalidateQueries({ queryKey: ['jobs', startupId] });
            toast.success("Job closed successfully.");
            setIsClosingJob(false);
        }
    });

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const sourceStage = source.droppableId;
        const destStage = destination.droppableId;

        // Optimistic Update
        const newPipeline = { ...pipelineData };
        const sourceList = Array.from(newPipeline[sourceStage]);
        const [movedApp] = sourceList.splice(source.index, 1);
        movedApp.stage = destStage; // Update local stage

        const destList = Array.from(newPipeline[destStage] || []);
        destList.splice(destination.index, 0, movedApp);

        newPipeline[sourceStage] = sourceList;
        newPipeline[destStage] = destList;

        setPipelineData(newPipeline);

        // API Call
        moveMutation.mutate({ appId: Number(draggableId), stage: destStage });
    };

    if (isJobLoading || isPipelineLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{job?.title}</h1>
                        <p className="text-sm text-gray-500">{job?.location} • {job?.status}</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    {job?.status !== 'Closed' && (
                        <>
                            {isClosingJob ? (
                                <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                                    <span className="text-sm text-red-700">Close this job?</span>
                                    <button
                                        onClick={() => closeJobMutation.mutate()}
                                        className="text-xs font-bold text-red-600 hover:underline"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => setIsClosingJob(false)}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        No
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsClosingJob(true)}
                                    className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-sm"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Close Job
                                </button>
                            )}

                            <button
                                onClick={() => setIsAddCandidateOpen(true)}
                                className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Candidate
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex h-full gap-4 pb-4 min-w-max">
                        {STAGES.map((stage) => (
                            <div key={stage} className="w-80 flex-shrink-0 flex flex-col bg-gray-50 rounded-lg border border-gray-200">
                                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg">
                                    <h3 className="font-semibold text-gray-700">{stage}</h3>
                                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                        {pipelineData[stage]?.length || 0}
                                    </span>
                                </div>
                                <Droppable droppableId={stage}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 p-2 overflow-y-auto min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                                                }`}
                                        >
                                            {pipelineData[stage]?.map((app: Application, index: number) => (
                                                <Draggable
                                                    key={app.id}
                                                    draggableId={String(app.id)}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`p-3 mb-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow group ${snapshot.isDragging ? 'rotate-2 shadow-lg ring-2 ring-brand-primary/20' : 'border-gray-200'
                                                                }`}
                                                            style={provided.draggableProps.style}
                                                            onClick={() => setSelectedApplicationId(app.id)}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-medium text-gray-900 line-clamp-1">{app.candidate_name}</span>
                                                                {app.ai_score !== undefined && (
                                                                    <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded border text-xs font-bold ${getScoreColor(app.ai_score)}`}>
                                                                        <Star className="w-3 h-3 fill-current" />
                                                                        <span>{app.ai_score}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Experience & Role */}
                                                            {app.candidate?.parsed_data && (
                                                                <div className="text-xs text-gray-600 mb-2">
                                                                    {app.candidate.parsed_data.experience_years && (
                                                                        <span className="font-medium">{app.candidate.parsed_data.experience_years} yrs exp</span>
                                                                    )}
                                                                    {app.candidate.parsed_data.current_role && (
                                                                        <span className="ml-2">• {app.candidate.parsed_data.current_role}</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Contact Details */}
                                                            {app.candidate?.email && (
                                                                <div className="text-xs text-gray-500 truncate mb-0.5">
                                                                    📧 {app.candidate.email}
                                                                </div>
                                                            )}
                                                            {app.candidate?.phone && (
                                                                <div className="text-xs text-gray-500 truncate mb-2">
                                                                    📞 {app.candidate.phone}
                                                                </div>
                                                            )}

                                                            {/* Top Skills */}
                                                            {app.candidate?.parsed_data?.skills && app.candidate.parsed_data.skills.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {app.candidate.parsed_data.skills.slice(0, 3).map((skill, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                                                                        >
                                                                            {skill}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Key Strength or Application Date */}
                                                            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                                                <div className="flex items-center">
                                                                    <Calendar className="w-3 h-3 mr-1" />
                                                                    <span>{new Date(app.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                                {app.ai_analysis?.strengths && app.ai_analysis.strengths.length > 0 && (
                                                                    <span className="text-green-600 text-xs">✓ {app.ai_analysis.strengths[0].slice(0, 20)}...</span>
                                                                )}
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
                </div>
            </DragDropContext>

            <AddCandidateModal
                isOpen={isAddCandidateOpen}
                onClose={() => setIsAddCandidateOpen(false)}
                startupId={startupId}
                jobId={jobId}
            />

            {selectedApplicationId && (
                <CandidateReview
                    applicationId={selectedApplicationId}
                    onClose={() => setSelectedApplicationId(null)}
                    onUpdate={() => {
                        queryClient.invalidateQueries({ queryKey: ['job-pipeline', jobId] });
                    }}
                />
            )}
        </div>
    );
};

export default JobDetail;
