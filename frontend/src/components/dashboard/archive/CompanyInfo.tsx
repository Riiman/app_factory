import React, { FC } from 'react';

interface CompanyInfoProps {
  companyName: string;
  vision: string;
  mission: string;
  location: string;
  website: string;
}

const CompanyInfo: FC<CompanyInfoProps> = ({ companyName, vision, mission, location, website }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Company Information</h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-gray-600">Company Name</h4>
          <p className="text-gray-800">{companyName}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Vision</h4>
          <p className="text-gray-800">{vision}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Mission</h4>
          <p className="text-gray-800">{mission}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Location</h4>
          <p className="text-gray-800">{location}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-600">Website</h4>
          <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{website}</a>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfo;
