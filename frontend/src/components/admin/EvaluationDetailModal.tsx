
import React from 'react';
import { Submission, Evaluation, User } from '@/types/dashboard-types';
import { X } from 'lucide-react';
import StatusBadge from './StatusBadge';

type SubmissionWithDetails = Submission & {
  user?: User;
  evaluation?: Evaluation;
};

interface EvaluationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionWithDetails | null;
}

const AnalysisSection: React.FC<{ title: string; data: Record<string, any> }> = ({ title, data }) => (
  <div>
    <h4 className="text-md font-semibold text-brand-text-primary mb-2 border-b pb-1">{title}</h4>
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {Object.entries(data).map(([key, value]) => (
        <React.Fragment key={key}>
          <dt className="font-medium text-slate-500">{key}</dt>
          <dd className="text-brand-text-secondary">{String(value)}</dd>
        </React.Fragment>
      ))}
    </dl>
  </div>
);

const EvaluationDetailModal: React.FC<EvaluationDetailModalProps> = ({ isOpen, onClose, submission }) => {
  if (!isOpen || !submission || !submission.evaluation) return null;

  const { evaluation } = submission;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-brand-text-primary">Submission & Evaluation Details</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Submission Info */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="text-xl font-bold text-brand-primary">{submission.startupName}</h3>
            <div className="flex items-center space-x-4 mt-2 text-sm">
                <StatusBadge status={submission.status} />
                <span>Submitted by: <span className="font-semibold">{submission.user?.fullName}</span></span>
                <span>On: <span className="font-semibold">{new Date(submission.submittedAt).toLocaleDateString()}</span></span>
            </div>
          </div>

          {/* Core Idea */}
          <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-brand-text-primary">Problem Statement</h4>
                <p className="text-sm text-brand-text-secondary mt-1">{submission.problemStatement}</p>
            </div>
            <div>
                <h4 className="font-semibold text-brand-text-primary">Product/Service Idea</h4>
                <p className="text-sm text-brand-text-secondary mt-1">{submission.productServiceIdea}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 my-4"></div>

          {/* Detailed Evaluation */}
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-brand-text-primary">Detailed Evaluation</h3>
            <AnalysisSection title="Problem Analysis" data={evaluation.problemAnalysis} />
            <AnalysisSection title="Solution Analysis" data={evaluation.solutionAnalysis} />
            <AnalysisSection title="Market Analysis" data={evaluation.marketAnalysis} />
            <AnalysisSection title="Competitor Analysis" data={evaluation.competitorAnalysis} />
            <AnalysisSection title="Growth Analysis" data={evaluation.growthAnalysis} />
            <AnalysisSection title="Risks Analysis" data={evaluation.risksAnalysis} />
          </div>

          <div className="border-t border-slate-200 my-4"></div>
          
          {/* Final Assessment */}
          <div>
            <h3 className="text-lg font-semibold text-brand-text-primary mb-2">Final Assessment</h3>
            <div className="bg-brand-primary/5 p-4 rounded-lg">
                <h4 className="font-semibold text-brand-text-primary">Overall Summary</h4>
                <p className="text-sm text-brand-text-secondary mt-1 mb-4">{evaluation.overallSummary}</p>
                <div className="flex justify-end items-baseline">
                    <span className="text-sm text-brand-text-secondary mr-2">Overall Score:</span>
                    <span className="text-4xl font-bold text-brand-primary">{evaluation.overallScore}</span>
                    <span className="text-brand-text-secondary">/10</span>
                </div>
            </div>
          </div>

        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-brand-text-primary"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDetailModal;
