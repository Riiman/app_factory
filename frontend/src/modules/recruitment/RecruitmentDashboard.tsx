
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Plus, MapPin, Users, DollarSign } from 'lucide-react';
import { Job, JobStatus } from '@/types/dashboard-types';
import CreateJobWizard from './CreateJobWizard';
import { useNavigate } from 'react-router-dom';

interface RecruitmentDashboardProps {
    startupId: number;
    onSelectJob: (jobId: number) => void;
}

const RecruitmentDashboard: React.FC<RecruitmentDashboardProps> = ({ startupId, onSelectJob }) => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ['jobs', startupId],
        queryFn: () => api.getJobs(startupId),
        enabled: !!startupId,
    });

    const getStatusColor = (status: JobStatus) => {
        switch (status) {
            case JobStatus.OPEN: return 'bg-green-100 text-green-800';
            case JobStatus.CLOSED: return 'bg-red-100 text-red-800';
            case JobStatus.ARCHIVED: return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading jobs...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
                    <p className="text-gray-500 mt-1">Manage jobs, candidates, and hiring pipeline.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)} // Or navigate to a create page
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Job
                </button>
            </div>

            {jobs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <h3 className="text-lg font-medium text-gray-900">No active jobs</h3>
                    <p className="mt-1 text-gray-500">Get started by creating your first job posting.</p>
                    <div className="mt-6">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Create Job
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job: Job) => (
                        <div
                            key={job.id}
                            onClick={() => onSelectJob(job.id)}
                            className="cursor-pointer transition-transform hover:-translate-y-1"
                        >
                            <Card className="h-full hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1" title={job.title}>
                                        {job.title}
                                    </h3>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                                        {job.status}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{job.location || 'Remote'}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>
                                            {job.salary_min && job.salary_max
                                                ? `${job.currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                                                : 'Salary not specified'}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{job.application_count || 0} Applicants</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">
                                        Posted {new Date(job.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="text-sm font-medium text-brand-primary">View Pipeline &rarr;</span>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* We will implement this component next */}
            {isCreateModalOpen && (
                <CreateJobWizard
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    startupId={startupId}
                />
            )}
        </div>
    );
};

export default RecruitmentDashboard;
