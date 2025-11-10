import React, { FC } from 'react';

const PendingReviewPage: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32 mb-4"></div>
        <h2 className="text-2xl font-semibold text-gray-800">Submission Under Review</h2>
        <p className="text-gray-600 mt-2">
          Your startup idea has been submitted and is currently under review. 
          <br />
          We will notify you once the review process is complete.
        </p>
      </div>
      <style>{`
        .loader {
          border-top-color: #3498db;
          animation: spinner 1.5s linear infinite;
        }
        @keyframes spinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PendingReviewPage;
