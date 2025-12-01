
import React from 'react';
import type { Contract } from '@/types/dashboard-types';
import { ArrowTopRightOnSquareIcon } from './icons';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentViewerProps {
  document: Contract;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 h-full flex flex-col justify-between">
      <div className="flex-grow overflow-auto">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Document</h2>
        {document.content ? (
          <div className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-4 bg-slate-50">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="aspect-[3/4] w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-6">
            <img
              src={document.document_url}
              alt={document.title}
              className="w-full h-full object-cover object-top"
            />
          </div>
        )}
      </div>
      {!document.content && (
        <a
          href={document.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center gap-2 mt-4"
        >
          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
          View Full Document
        </a>
      )}
    </div>
  );
};

export default DocumentViewer;
