import React, { useState, useMemo } from 'react';
import { Submission, Evaluation, User, SubmissionStatus } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { Inbox, FileCheck, FileX, User as UserIcon, Eye, FileClock } from 'lucide-react';
import EvaluationDetailModal from '../../components/admin/EvaluationDetailModal';

interface SubmissionsViewProps {
  submissions: Submission[];
  onUpdateStatus: (submissionId: number, status: SubmissionStatus) => Promise<void>;
}

const SubmissionsView: React.FC<SubmissionsViewProps> = ({ submissions, onUpdateStatus }) => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<number | null>(null);

  const submissionsWithDetails = useMemo(() => {
    return submissions.filter(s => s.status === SubmissionStatus.PENDING).map(sub => ({
      ...sub,
    })).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [submissions]);

  const handleSelectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  const handleStatusUpdate = async (id: number, status: SubmissionStatus) => {
    setUpdatingSubmissionId(id);
    try {
      await onUpdateStatus(id, status);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingSubmissionId(null);
    }
  };

  const selectedDetails = selectedSubmission ? submissionsWithDetails.find(s => s.id === selectedSubmission.id) : null;

  return (
    <>
      <div className="flex h-full">
        <div className="w-1/3 border-r border-slate-200 h-full overflow-y-auto">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold flex items-center"><Inbox className="mr-2 h-5 w-5" />Submissions</h2>
          </div>
          <ul>
            {submissionsWithDetails.map(sub => (
              <li key={sub.id}>
                <button
                  onClick={() => handleSelectSubmission(sub)}
                  className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedSubmission?.id === sub.id ? 'bg-brand-primary/5' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-brand-text-primary">{sub.startup_name}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-sm text-brand-text-secondary mt-1">by {sub.user?.full_name || 'Unknown User'}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{sub.user?.email}{sub.user?.mobile && ` • ${sub.user.mobile}`}</p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(sub.submitted_at).toLocaleString()}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-2/3 h-full overflow-y-auto p-8">
          {selectedDetails ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-brand-text-primary">{selectedDetails.startup_name}</h2>
                  <div className="flex items-center space-x-2 mt-1 flex-wrap">
                    <StatusBadge status={selectedDetails.status} />
                    <span className="text-slate-400">&bull;</span>
                    <div className="flex items-center text-sm text-brand-text-secondary">
                      <UserIcon className="mr-1.5 h-4 w-4" /> Submitted by <span className="font-semibold ml-1">{selectedDetails.user?.full_name}</span>
                    </div>
                    <span className="text-slate-400 mx-2">&bull;</span>
                    <a href={`mailto:${selectedDetails.user?.email}`} className="text-sm text-brand-primary hover:underline">{selectedDetails.user?.email}</a>
                    {selectedDetails.user?.mobile && (
                      <>
                        <span className="text-slate-400 mx-2">&bull;</span>
                        <a href={`tel:${selectedDetails.user.mobile}`} className="text-sm text-brand-text-secondary hover:underline">{selectedDetails.user.mobile}</a>
                      </>
                    )}
                  </div>
                </div>
                {selectedDetails.status === SubmissionStatus.PENDING && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(selectedDetails.id, SubmissionStatus.REJECTED)}
                      disabled={updatingSubmissionId !== null}
                      className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingSubmissionId === selectedDetails.id ? 'Processing...' : <><FileX className="mr-2 h-4 w-4" /> Reject</>}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedDetails.id, SubmissionStatus.IN_REVIEW)}
                      disabled={updatingSubmissionId !== null}
                      className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingSubmissionId === selectedDetails.id ? 'Processing...' : <><FileClock className="mr-2 h-4 w-4" /> Move to Review</>}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedDetails.id, SubmissionStatus.APPROVED)}
                      disabled={updatingSubmissionId !== null}
                      className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingSubmissionId === selectedDetails.id ? 'Processing...' : <><FileCheck className="mr-2 h-4 w-4" /> Approve</>}
                    </button>
                  </div>
                )}
              </div>

              <Card title="Submission Details">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Founders and Inspiration</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.founders_and_inspiration}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Problem Statement</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.problem_statement}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Who Experiences Problem</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.who_experiences_problem}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Product/Service Idea</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.product_service_idea}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">How Solves Problem</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.how_solves_problem}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Intended Users/Customers</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.intended_users_customers}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Main Competitors/Alternatives</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.main_competitors_alternatives}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">How Stands Out</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.how_stands_out}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text-primary">Startup Type</h4>
                    <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.startup_type}</p>
                  </div>
                </div>
              </Card>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Inbox className="mx-auto h-12 w-12 text-slate-400" />
                <h2 className="mt-4 text-xl font-semibold">Select a Submission</h2>
                <p className="text-brand-text-secondary mt-1">Choose a submission from the list to view its details and evaluation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SubmissionsView;