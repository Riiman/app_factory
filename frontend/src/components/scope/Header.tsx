
import React from 'react';
import type { ScopeDocument } from '@/types/dashboard-types';

interface HeaderProps {
  document: Omit<ScopeDocument, 'sections'>;
}

export const Header: React.FC<HeaderProps> = ({ document }) => {
  return (
    <header className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{document.title}</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-100 p-3 rounded-md">
          <p className="text-gray-500 font-medium">Client</p>
          <p className="font-semibold text-gray-800">{document.client}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-md">
          <p className="text-gray-500 font-medium">Provider</p>
          <p className="font-semibold text-gray-800">{document.provider}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-md">
          <p className="text-gray-500 font-medium">Date</p>
          <p className="font-semibold text-gray-800">{document.date}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-md">
          <p className="text-gray-500 font-medium">Version</p>
          <p className="font-semibold text-gray-800">{document.version}</p>
        </div>
      </div>
    </header>
  );
};
