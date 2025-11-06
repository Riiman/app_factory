
import React from 'react';

interface ActionBarProps {
  onAccept: () => void;
  onReject: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({ onAccept, onReject }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 p-4 z-30">
      <div className="max-w-4xl mx-auto flex justify-end items-center space-x-4">
         <p className="text-sm text-gray-600 mr-auto hidden md:block">
            Please review all sections carefully before making a final decision.
        </p>
        <button
          onClick={onReject}
          className="px-6 py-3 text-base font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform hover:scale-105"
        >
          Reject Scope
        </button>
        <button
          onClick={onAccept}
          className="px-6 py-3 text-base font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105"
        >
          Accept Scope
        </button>
      </div>
    </div>
  );
};
