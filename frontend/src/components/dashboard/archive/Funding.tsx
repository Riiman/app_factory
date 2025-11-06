import React, { FC } from 'react';

interface FundingProps {
  fundingStatus: 'Bootstrapped' | 'Pre-Seed' | 'Seed' | 'Series A';
  amountRaised: number;
  nextFundingGoal: number;
}

const Funding: FC<FundingProps> = ({ fundingStatus, amountRaised, nextFundingGoal }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Funding</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <h4 className="font-semibold text-gray-600">Status</h4>
          <p className="text-lg font-bold text-gray-800">{fundingStatus}</p>
        </div>
        <div className="text-center">
          <h4 className="font-semibold text-gray-600">Amount Raised</h4>
          <p className="text-lg font-bold text-gray-800">${amountRaised.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <h4 className="font-semibold text-gray-600">Next Funding Goal</h4>
          <p className="text-lg font-bold text-gray-800">${nextFundingGoal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Funding;
