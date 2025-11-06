import React, { FC } from 'react';

interface BusinessProps {
  businessModel: string;
  targetAudience: string;
  pricingStrategy: string;
}

const Business: FC<BusinessProps> = ({ businessModel, targetAudience, pricingStrategy }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Business Model</h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-gray-600">Business Model</h4>
          <p className="text-gray-800">{businessModel}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Target Audience</h4>
          <p className="text-gray-800">{targetAudience}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Pricing Strategy</h4>
          <p className="text-gray-800">{pricingStrategy}</p>
        </div>
      </div>
    </div>
  );
};

export default Business;
