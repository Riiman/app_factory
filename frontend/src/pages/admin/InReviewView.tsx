import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Submission, Evaluation, User, SubmissionStatus, Startup, Scope } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { FileClock, FileCheck, FileX, User as UserIcon, PlusCircle, CheckSquare } from 'lucide-react';

interface InReviewViewProps {
  submissions: Submission[];
  users: User[];
  startups: Startup[];
  onUpdateStatus: (submissionId: number, status: SubmissionStatus) => void;
  onAddTask: (startupId: number, taskName: string, scope: Scope) => void;
}

const InReviewView: React.FC<InReviewViewProps> = ({ submissions, users, startups, onUpdateStatus, onAddTask }) => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [newTaskName, setNewTaskName] = useState('');

  const submissionsWithDetails = useMemo(() => {
    const inReviewSubs = submissions.filter(s => s.status === SubmissionStatus.IN_REVIEW);
    return inReviewSubs.map(sub => {
      const user = users.find(u => u.id === sub.user_id);
      const startup = startups.find(st => st.submission_id === sub.id);
      return {
        ...sub,
        user,
        startup,
      };
    }).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [submissions, users, startups]);

  useEffect(() => {
    // If there's no selected submission but there are submissions in the list,
    // default to selecting the first one.
    if (!selectedSubmission && submissionsWithDetails.length > 0) {
      setSelectedSubmission(submissionsWithDetails[0]);
    }
    // If a submission was selected, but it's no longer in the list (e.g., status changed),
    // clear the selection or select the first one again.
    if (selectedSubmission && !submissionsWithDetails.find(s => s.id === selectedSubmission.id)) {
      setSelectedSubmission(submissionsWithDetails.length > 0 ? submissionsWithDetails[0] : null);
    }
  }, [submissionsWithDetails, selectedSubmission]);
  
  const handleSelectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setNewTaskName('');
  };

  const selectedDetails = selectedSubmission ? submissionsWithDetails.find(s => s.id === selectedSubmission.id) : null;
  const associatedStartup = selectedDetails?.startup;

  console.log('--- Frontend InReviewView Selected Details ---', selectedDetails);
  if (selectedDetails) {
    console.log('--- Frontend InReviewView Evaluation Data ---', selectedDetails.evaluation);
    console.log('--- Frontend InReviewView Startup Data ---', associatedStartup);
  }

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim() && associatedStartup) {
      onAddTask(associatedStartup.id, newTaskName.trim(), Scope.GENERAL);
      setNewTaskName('');
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-slate-200 h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold flex items-center"><FileClock className="mr-2 h-5 w-5" />In Review</h2>
        </div>
        <ul>
          {submissionsWithDetails.map(sub => (
            <li key={sub.id}>
              <button
                onClick={() => handleSelectSubmission(sub)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedSubmission?.id === sub.id ? 'bg-brand-primary/5' : ''}`}
              >
                <p className="font-semibold text-brand-text-primary">{sub.startup_name}</p>
                <p className="text-sm text-brand-text-secondary mt-1">by {sub.user?.full_name || 'Unknown User'}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{sub.user?.email}{sub.user?.mobile && ` • ${sub.user.mobile}`}</p>
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
              <div className="flex space-x-2">
                  <button onClick={() => onUpdateStatus(selectedDetails.id, SubmissionStatus.REJECTED)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                      <FileX className="mr-2 h-4 w-4" /> Reject
                  </button>
                  <button onClick={() => onUpdateStatus(selectedDetails.id, SubmissionStatus.APPROVED)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                      <FileCheck className="mr-2 h-4 w-4" /> Approve
                  </button>
              </div>
            </div>

            {associatedStartup && (
              <Card title="Onboarding Tasks">
                  <form onSubmit={handleAddTaskSubmit} className="flex items-center space-x-2 mb-4">
                      <input
                          type="text"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          placeholder="e.g., Complete legal paperwork"
                          className="flex-grow px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                      />
                      <button type="submit" className="flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90 disabled:opacity-50" disabled={!newTaskName.trim()}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                      </button>
                  </form>
                  {associatedStartup.tasks.length > 0 ? (
                      <ul className="space-y-2">
                          {associatedStartup.tasks.map(task => (
                              <li key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                                  <span className="text-sm text-brand-text-primary">{task.name}</span>
                                  <StatusBadge status={task.status} />
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="text-sm text-center text-slate-500 py-4">No tasks assigned yet.</p>
                  )}
              </Card>
            )}

            <Card title="Submission Details">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-brand-text-primary">Problem Statement</h4>
                        <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.problem_statement}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-brand-text-primary">Product/Service Idea</h4>
                        <p className="text-sm text-brand-text-secondary mt-1">{selectedDetails.product_service_idea}</p>
                    </div>
                </div>
            </Card>

            {selectedDetails.evaluation && (
              <>
                <Card title="Evaluation Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-bold text-gray-600">Overall Score</h5>
                      <p className="text-2xl font-semibold text-blue-600">{selectedDetails.evaluation.overall_score || 'Not scored'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-bold text-gray-600">Final Decision</h5>
                      <p className="text-xl font-semibold text-green-600">{selectedDetails.evaluation.final_decision || 'No decision'}</p>
                    </div>
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-md">
                      <h5 className="font-bold text-gray-600">Overall Summary</h5>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{selectedDetails.evaluation.overall_summary || 'No summary provided.'}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </Card>
                <Card title="Problem Analysis">
                  <div className="prose prose-sm max-w-none text-brand-text-secondary mt-1">
                    <ReactMarkdown>{selectedDetails.evaluation.problem_analysis?.summary || 'Not available.'}</ReactMarkdown>
                  </div>
                </Card>
                <Card title="Solution Analysis">
                  <div className="prose prose-sm max-w-none text-brand-text-secondary mt-1">
                    <ReactMarkdown>{selectedDetails.evaluation.solution_analysis?.summary || 'Not available.'}</ReactMarkdown>
                  </div>
                </Card>
                <Card title="Market Analysis">
                  <div className="prose prose-sm max-w-none text-brand-text-secondary mt-1">
                    <ReactMarkdown>{selectedDetails.evaluation.market_analysis?.summary || 'Not available.'}</ReactMarkdown>
                  </div>
                </Card>
                <Card title="Growth Potential Analysis">
                  <div className="prose prose-sm max-w-none text-brand-text-secondary mt-1">
                    <ReactMarkdown>{selectedDetails.evaluation.growth_potential?.summary || 'Not available.'}</ReactMarkdown>
                  </div>
                </Card>
                <Card title="Competitor Analysis">
                  <div className="prose prose-sm max-w-none text-brand-text-secondary mt-1">
                    <ReactMarkdown>{selectedDetails.evaluation.competitor_analysis?.summary || 'Not available.'}</ReactMarkdown>
                  </div>
                </Card>
                <Card title="Risks Analysis">
                  <div className="prose prose-sm max-w-none text-brand-text-secondary mt-1">
                    <ReactMarkdown>{selectedDetails.evaluation.risk_analysis?.summary || 'Not available.'}</ReactMarkdown>
                  </div>
                </Card>
              </>
            )}

          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileClock className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-xl font-semibold">Select a Submission</h2>
              <p className="text-brand-text-secondary mt-1">Choose a submission from the list to assign tasks and manage its review process.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InReviewView;