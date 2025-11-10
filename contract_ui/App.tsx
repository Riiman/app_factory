import React, { useState } from 'react';
import type { Document, Signatory } from './types';
import { DocumentStatus, SignatoryStatus } from './types';
import DocumentViewer from './components/DocumentViewer';
import StatusTracker from './components/StatusTracker';
import SignatoryList from './components/SignatoryList';
import AddSignatory from './components/AddSignatory';
import { DocumentIcon } from './components/icons';

const initialDocument: Document = {
  id: 'doc1',
  title: 'Mutual Non-Disclosure Agreement',
  status: DocumentStatus.OUT_FOR_SIGNATURE,
  sentOn: new Date('2023-10-26T10:00:00Z'),
  documentUrl: '#',
  documentPreviewUrl: 'https://picsum.photos/seed/doc1/300/400',
  signatories: [
    { id: 'sig1', name: 'Alice Johnson', email: 'alice@example.com', status: SignatoryStatus.NOT_SIGNED },
  ],
};


const getStatusPill = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.COMPLETED:
        return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">{status}</span>;
      case DocumentStatus.PARTIALLY_SIGNED:
        return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">{status}</span>;
      case DocumentStatus.OUT_FOR_SIGNATURE:
        return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{status}</span>;
      case DocumentStatus.VOIDED:
        return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">{status}</span>;
      default:
        return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

const App: React.FC = () => {
  const [document, setDocument] = useState<Document>(initialDocument);

  const handleAddSignatory = (name: string, email: string) => {
    const newSignatory: Signatory = {
      id: `sig-${Date.now()}`,
      name,
      email,
      status: SignatoryStatus.NOT_SIGNED,
    };

    setDocument(prevDoc => {
      const updatedSignatories = [...prevDoc.signatories, newSignatory];
      
      const hasSigned = updatedSignatories.some(s => s.status === SignatoryStatus.SIGNED);
      const allSigned = updatedSignatories.every(s => s.status === SignatoryStatus.SIGNED);
      
      let newStatus: DocumentStatus;
      if (allSigned) {
        newStatus = DocumentStatus.COMPLETED;
      } else if (hasSigned) {
        newStatus = DocumentStatus.PARTIALLY_SIGNED;
      } else {
        newStatus = DocumentStatus.OUT_FOR_SIGNATURE;
      }
      
      return {
        ...prevDoc,
        signatories: updatedSignatories,
        status: newStatus,
      };
    });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 pb-4 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900">Document Status</h1>
          <p className="text-slate-500 mt-1">Track the progress of your e-signature document.</p>
        </header>

        <main>
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                 <DocumentIcon className="w-6 h-6"/>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{document.title}</h2>
                <div className="flex items-center mt-1">
                 {getStatusPill(document.status)}
                </div>
              </div>
            </div>
           
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <DocumentViewer document={document} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-6">
              <StatusTracker document={document} />
              <SignatoryList document={document} />
              <AddSignatory onAddSignatory={handleAddSignatory} />
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} E-Signature Tracker. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
