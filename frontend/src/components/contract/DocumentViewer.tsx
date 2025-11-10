
import React from 'react';
import type { Document } from '@/types/dashboard-types';
import { ArrowTopRightOnSquareIcon } from './icons';

interface DocumentViewerProps {
  document: Document;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 h-full flex flex-col justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Document</h2>
        <div className="aspect-[3/4] w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-6">
          <img 
            src={document.documentPreviewUrl} 
            alt={document.title} 
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>
      <a
        href={document.documentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <ArrowTopRightOnSquareIcon className="w-5 h-5" />
        View Full Document
      </a>
    </div>
  );
};

export default DocumentViewer;
