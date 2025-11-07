import React, { useState, useEffect, useCallback } from 'react';
import type { Document, Signatory } from '@/components/contract/contract-types';
import { DocumentStatus, SignatoryStatus } from '@/components/contract/contract-types';
import DocumentViewer from '@/components/contract/DocumentViewer';
import StatusTracker from '@/components/contract/StatusTracker';
import SignatoryList from '@/components/contract/SignatoryList';
import { DocumentIcon } from '@/components/contract/icons';
import api from '@/utils/api'; // To be used later

// Mock Data - to be replaced by API calls
const MOCK_DOCUMENT: Document = {
  id: 'doc1',
  title: 'Founder Agreement & Vesting Schedule',
  status: DocumentStatus.OUT_FOR_SIGNATURE,
  sentOn: new Date('2024-11-01T10:00:00Z'),
  documentUrl: '#', // This would be a link to DocuSign, etc.
  documentPreviewUrl: 'https://via.placeholder.com/300x400.png?text=Contract+Preview',
  signatories: [
    { id: 'sig1', name: 'Founder Name', email: 'founder@startup.com', status: SignatoryStatus.NOT_SIGNED },
    { id: 'sig2', name: 'Incubator Director', email: 'director@incubator.com', status: SignatoryStatus.NOT_SIGNED },
  ],
};

const getStatusPill = (status: DocumentStatus) => {
    // This is a UI helper, can remain on the frontend
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

const ContractPage: React.FC = () => {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);
        const data = await api.getContractDetails();
        setDocument(data);
      } catch (err) {
        setError('Failed to load contract details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContractData();
  }, []);

  const handleSignDocument = useCallback(async () => {
    if (!document) return;
    try {
      // Simulate API call to sign document
      await api.signDocument(document.id);
      setDocument(prevDoc => prevDoc ? { ...prevDoc, status: DocumentStatus.COMPLETED } : null);
      alert('Document signed successfully!');
    } catch (err) {
      console.error('Failed to sign document:', err);
      alert('Failed to sign document. Please try again.');
    }
  }, [document]);

  if (loading) {
    return <div>Loading Contract Information...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!document) {
    return <div>No contract has been issued yet.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <DocumentIcon className="w-8 h-8 mr-3 text-indigo-600" />
            {document.title}
          </h1>
          {getStatusPill(document.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Document Details</h2>
            <p className="text-gray-700 mb-1"><strong>Status:</strong> {document.status}</p>
            <p className="text-gray-700 mb-1"><strong>Sent On:</strong> {document.sentOn.toLocaleDateString()}</p>
            <p className="text-gray-700 mb-1">
              <strong>View Document:</strong> <a href={document.documentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Open Link</a>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Signatories</h2>
            <SignatoryList signatories={document.signatories} />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Document Preview</h2>
          <DocumentViewer documentPreviewUrl={document.documentPreviewUrl} />
        </div>

        <div className="flex justify-end">
          {document.status === DocumentStatus.OUT_FOR_SIGNATURE && (
            <button
              onClick={handleSignDocument}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Sign Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractPage;