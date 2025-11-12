import React from 'react';
import type { Contract, ContractSignatory } from '@/types/dashboard-types';
import { CheckCircleIcon, ClockIcon, UserIcon } from './icons';

interface SignatoryListProps {
  document: Contract;
}

const getStatusBadge = (status: 'Not Signed' | 'Signed') => {
  switch (status) {
    case 'Signed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-4 h-4 mr-1.5" />
          Signed
        </span>
      );
    case 'Not Signed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <ClockIcon className="w-4 h-4 mr-1.5" />
          Awaiting Signature
        </span>
      );
    default:
      return null;
  }
};

const SignatoryList: React.FC<SignatoryListProps> = ({ document }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Signatories</h2>
      <ul className="space-y-4">
        {document.signatories.map((signatory: ContractSignatory) => (
          <li key={signatory.id} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                <UserIcon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-slate-900">{signatory.name}</div>
                <div className="text-sm text-slate-500">{signatory.email}</div>
              </div>
            </div>
            {getStatusBadge(signatory.status)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SignatoryList;