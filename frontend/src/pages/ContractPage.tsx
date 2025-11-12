import React, { useState, useEffect, useCallback } from 'react';
import type { Contract } from '@/types/dashboard-types';
import { ContractStatus } from '@/types/dashboard-types';
import DocumentViewer from '@/components/contract/DocumentViewer';
import SignatoryList from '@/components/contract/SignatoryList';
import { DocumentIcon } from '@/components/contract/icons';
import api from '@/utils/api';

const ContractPage: React.FC = () => {
  const [document, setDocument] = useState<Contract | null>(null);
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
      await api.signDocument(document.id);
      setDocument(prevDoc => prevDoc ? { ...prevDoc, status: ContractStatus.SIGNED } : null);
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
          <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${
            document.status === ContractStatus.SIGNED ? 'bg-green-100 text-green-800' :
            document.status === ContractStatus.SENT ? 'bg-amber-100 text-amber-800' :
            'bg-slate-100 text-slate-800'
          }`}>{document.status}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Document Details</h2>
            <p className="text-gray-700 mb-1"><strong>Status:</strong> {document.status}</p>
            <p className="text-gray-700 mb-1"><strong>Sent On:</strong> {document.sent_at ? new Date(document.sent_at).toLocaleDateString() : 'N/A'}</p>
            <p className="text-gray-700 mb-1">
              <strong>View Document:</strong> <a href={document.document_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Open Link</a>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Signatories</h2>
            <SignatoryList document={document} />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Document Preview</h2>
          <DocumentViewer document={document} />
        </div>

        <div className="flex justify-end">
          {document.status === ContractStatus.SENT && (
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