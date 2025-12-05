
import React from 'react';

import { ScopeStatus } from '@/types/dashboard-types';

interface ActionBarProps {
  onAccept: () => void;
  onReject: () => void;
  status: ScopeStatus;
  founderAccepted?: boolean;
  adminAccepted?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({ onAccept, onReject, status, founderAccepted, adminAccepted }) => {
  const isAccepted = status === ScopeStatus.ACCEPTED;
  const isPendingAdmin = founderAccepted && !adminAccepted;

  if (isAccepted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-green-50/90 backdrop-blur-lg border-t border-green-200 p-4 z-30">
        <div className="max-w-4xl mx-auto flex justify-center items-center">
          <p className="text-lg font-semibold text-green-700">
            Scope Accepted & Finalized
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 p-4 z-30">
      <div className="max-w-4xl mx-auto flex justify-end items-center space-x-4">
        <div className="mr-auto">
          {isPendingAdmin && (
            <p className="text-sm font-medium text-amber-600">
              You have accepted the scope. Waiting for Admin approval.
            </p>
          )}
          {!isPendingAdmin && (
            <p className="text-sm text-gray-600 hidden md:block">
              Please review all sections carefully before making a final decision.
            </p>
          )}
        </div>
        <button
          onClick={onReject}
          disabled={founderAccepted}
          className={`px-6 py-3 text-base font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform hover:scale-105 ${founderAccepted ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Reject Scope
        </button>
        <button
          onClick={onAccept}
          disabled={founderAccepted}
          className={`px-6 py-3 text-base font-semibold text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105 ${founderAccepted ? 'bg-green-800 opacity-80 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {founderAccepted ? 'Accepted' : 'Accept Scope'}
        </button>
      </div>
    </div>
  );
};
