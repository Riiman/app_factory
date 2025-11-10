import React, { FC } from 'react';

interface Milestone {
  name: string;
  dueDate: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
}

interface MilestonesProps {
  milestones: Milestone[];
}

const Milestones: FC<MilestonesProps> = ({ milestones }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Milestones</h3>
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <p className="font-semibold text-gray-700">{milestone.name}</p>
              <p className="text-sm text-gray-500">Due: {milestone.dueDate}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              milestone.status === 'Completed' ? 'bg-green-100 text-green-800' :
              milestone.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {milestone.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Milestones;
