import React, { FC } from 'react';

interface EvaluationProps {
  overallScore: number;
  finalDecision: string;
  overallSummary: string;
  problemAnalysis: { summary: string };
  solutionAnalysis: { summary: string };
}

const Evaluation: FC<EvaluationProps> = ({ overallScore, finalDecision, overallSummary, problemAnalysis, solutionAnalysis }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Initial Evaluation</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-md text-center">
          <h4 className="font-semibold text-blue-700">Overall Score</h4>
          <p className="text-3xl font-bold text-blue-600">{overallScore}/10</p>
        </div>
        <div className="bg-green-50 p-4 rounded-md text-center">
          <h4 className="font-semibold text-green-700">Final Decision</h4>
          <p className="text-xl font-bold text-green-600">{finalDecision}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-gray-600">Overall Summary</h4>
          <p className="text-gray-800">{overallSummary}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Problem Analysis</h4>
          <p className="text-gray-800">{problemAnalysis.summary}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Solution Analysis</h4>
          <p className="text-gray-800">{solutionAnalysis.summary}</p>
        </div>
      </div>
    </div>
  );
};

export default Evaluation;
