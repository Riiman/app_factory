import React, { FC } from 'react';
import { Link } from 'react-router-dom';

const RejectedSubmissionPage: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-center p-8 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-semibold text-red-600">Submission Not Approved</h2>
        <p className="text-gray-600 mt-2">
          Thank you for your submission. Unfortunately, after careful review, we have decided not to move forward with your idea at this time.
        </p>
        <p className="text-gray-500 mt-4 text-sm">
          You will be able to submit a new idea after 30 days from your original submission date.
        </p>
        <Link to="/logout" onClick={() => localStorage.clear()} className="mt-6 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Logout
        </Link>
      </div>
    </div>
  );
};

export default RejectedSubmissionPage;
