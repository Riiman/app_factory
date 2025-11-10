import React, { FC } from 'react';

interface OverviewProps {
  startupName: string;
  overallProgress: number;
  currentStage: string;
  nextMilestone: string;
  recentActivity: string[];
}

const Overview: FC<OverviewProps> = ({ startupName, overallProgress, currentStage, nextMilestone, recentActivity }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{startupName} Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-blue-700">Overall Progress</h3>
          <p className="text-3xl font-bold text-blue-600">{overallProgress}%</p>
        </div>
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-green-700">Current Stage</h3>
          <p className="text-xl text-green-600">{currentStage}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-yellow-700">Next Milestone</h3>
          <p className="text-xl text-yellow-600">{nextMilestone}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Recent Activity</h3>
        <ul className="list-disc list-inside text-gray-700">
          {recentActivity.map((activity, index) => (
            <li key={index} className="mb-1">{activity}</li>
          ))}
        </ul>
      </div>

      {/* Placeholder for more detailed sections */}
      <div className="mt-8 text-gray-600">
        <p>More detailed sections for Company Info, Products, Business Model, etc., will go here.</p>
      </div>
    </div>
  );
};

export default Overview;
