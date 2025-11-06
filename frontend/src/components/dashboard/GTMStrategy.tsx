import React, { FC } from 'react';

interface GTMStrategyProps {
  marketingChannels: string[];
  salesStrategy: string;
  customerAcquisitionCost: number;
}

const GTMStrategy: FC<GTMStrategyProps> = ({ marketingChannels, salesStrategy, customerAcquisitionCost }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Go-To-Market Strategy</h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-gray-600">Marketing Channels</h4>
          <p className="text-gray-800">{marketingChannels.join(', ')}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Sales Strategy</h4>
          <p className="text-gray-800">{salesStrategy}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Estimated Customer Acquisition Cost (CAC)</h4>
          <p className="text-gray-800">${customerAcquisitionCost}</p>
        </div>
      </div>
    </div>
  );
};

export default GTMStrategy;
