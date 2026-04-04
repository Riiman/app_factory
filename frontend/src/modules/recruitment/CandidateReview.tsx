import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Award, TrendingUp, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ScheduleInterviewModal from './components/ScheduleInterviewModal';

interface CandidateReviewProps {
    applicationId: number;
    onClose: () => void;
    onUpdate?: () => void;
}

interface ApplicationDetail {
    id: number;
    job_id: number;
    job_title: string;
    candidate_id: number;
    candidate_name: string;
    candidate: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        resume_url: string;
        parsed_data?: {
            skills?: string[];
            experience?: string;
            education?: string;
            summary?: string;
        };
    };
    status: string;
    stage: string;
    ai_score: number;
    ai_analysis?: {
        summary?: string;
        strengths?: string[];
        concerns?: string[];
        recommendation?: string;
    };
    created_at: string;
}

const CandidateReview: React.FC<CandidateReviewProps> = ({ applicationId, onClose, onUpdate }) => {
    const [application, setApplication] = useState<ApplicationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    useEffect(() => {
        fetchApplicationDetail();
        fetchActivities();
    }, [applicationId]);

    const fetchApplicationDetail = async () => {
        try {
            setLoading(true);
            const data = await api.getApplicationDetail(applicationId);
            setApplication(data);
        } catch (error) {
            console.error('Failed to fetch application details:', error);
            toast.error('Failed to load candidate details');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const data = await api.getApplicationActivities(applicationId);
            setActivities(data);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        try {
            setAddingNote(true);
            await api.addApplicationActivity(applicationId, newNote);
            setNewNote('');
            await fetchActivities();
            toast.success('Note added');
        } catch (error) {
            console.error('Failed to add note:', error);
            toast.error('Failed to add note');
        } finally {
            setAddingNote(false);
        }
    };

    const handleMoveStage = async (newStage: string) => {
        if (!application) return;

        try {
            setActionLoading(true);
            await api.moveApplication(application.id, newStage);
            toast.success(`Moved to ${newStage}`);
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to move application:', error);
            toast.error('Failed to update stage');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading candidate details...</p>
                </div>
            </div>
        );
    }

    if (!application) {
        return null;
    }

    const { candidate, ai_score, ai_analysis, stage } = application;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">Applying for {application.job_title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Main Content - Split View */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Resume Viewer */}
                    <div className="w-1/2 border-r flex flex-col">
                        <div className="p-4 bg-gray-50 border-b">
                            <h3 className="font-semibold text-gray-900">Resume</h3>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100">
                            {candidate.resume_url ? (
                                <iframe
                                    src={candidate.resume_url}
                                    className="w-full h-full"
                                    title="Resume PDF"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    No resume available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: AI Analysis & Details */}
                    <div className="w-1/2 flex flex-col overflow-auto">
                        <div className="p-6 space-y-6">
                            {/* Contact Info */}
                            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm">{candidate.email}</span>
                                </div>
                                {candidate.phone && (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Phone className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm">{candidate.phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* AI Score */}
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-900">AI Match Score</h3>
                                    </div>
                                    <div className="text-3xl font-bold text-purple-600">{ai_score}%</div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all ${ai_score >= 80
                                            ? 'bg-green-500'
                                            : ai_score >= 60
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                            }`}
                                        style={{ width: `${ai_score}%` }}
                                    />
                                </div>
                            </div>

                            {/* AI Analysis */}
                            {ai_analysis && (
                                <div className="space-y-4">
                                    {ai_analysis.summary && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                                            <p className="text-gray-700 text-sm leading-relaxed">{ai_analysis.summary}</p>
                                        </div>
                                    )}

                                    {ai_analysis.strengths && ai_analysis.strengths.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                                Strengths
                                            </h3>
                                            <ul className="space-y-1">
                                                {ai_analysis.strengths.map((strength, idx) => (
                                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="text-green-600 mt-1">•</span>
                                                        <span>{strength}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {ai_analysis.concerns && ai_analysis.concerns.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-orange-600" />
                                                Areas to Explore
                                            </h3>
                                            <ul className="space-y-1">
                                                {ai_analysis.concerns.map((concern, idx) => (
                                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="text-orange-600 mt-1">•</span>
                                                        <span>{concern}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {ai_analysis.recommendation && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-2">Recommendation</h3>
                                            <p className="text-sm text-gray-700">{ai_analysis.recommendation}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Parsed Resume Data */}
                            {candidate.parsed_data && (
                                <div className="space-y-4">
                                    {candidate.parsed_data.skills && candidate.parsed_data.skills.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {candidate.parsed_data.skills.map((skill, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {candidate.parsed_data.experience && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Experience</h3>
                                            <p className="text-sm text-gray-700">{candidate.parsed_data.experience}</p>
                                        </div>
                                    )}

                                    {candidate.parsed_data.education && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Education</h3>
                                            <p className="text-sm text-gray-700">{candidate.parsed_data.education}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes & Activity */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Notes & Activity</h3>

                                {/* Add Note */}
                                <div className="mb-4">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Add a note about this candidate (e.g., interview feedback, phone screen notes...)"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        rows={3}
                                    />
                                    <button
                                        onClick={handleAddNote}
                                        disabled={addingNote || !newNote.trim()}
                                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                                    >
                                        {addingNote ? 'Adding...' : 'Add Note'}
                                    </button>
                                </div>

                                {/* Activity Timeline */}
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {activities.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No notes yet. Add one above!</p>
                                    ) : (
                                        activities.map((activity) => (
                                            <div key={activity.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                <div className="flex items-start justify-between mb-1">
                                                    <span className="text-xs font-medium text-gray-900">{activity.action}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(activity.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                {activity.details?.note && (
                                                    <p className="text-sm text-gray-700 mt-1">{activity.details.note}</p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Current Stage: <span className="font-semibold text-gray-900">{stage}</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                            >
                                <Calendar className="w-4 h-4" />
                                Schedule Interview
                            </button>
                            <button
                                onClick={() => handleMoveStage('Rejected')}
                                disabled={actionLoading || stage === 'Rejected'}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                            <button
                                onClick={() => handleMoveStage('Interview')}
                                disabled={actionLoading || stage === 'Interview'}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                <Clock className="w-4 h-4" />
                                Move to Interview
                            </button>
                            <button
                                onClick={() => handleMoveStage('Hired')}
                                disabled={actionLoading || stage === 'Hired'}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Hire
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Interview Modal */}
            {application && (
                <ScheduleInterviewModal
                    isOpen={isScheduleModalOpen}
                    onClose={() => setIsScheduleModalOpen(false)}
                    applicationId={applicationId}
                    candidateName={application.candidate.name}
                    jobTitle={application.job_title}
                    onSuccess={() => {
                        fetchApplicationDetail();
                        fetchActivities();
                    }}
                />
            )}
        </div>
    );
};

export default CandidateReview;
