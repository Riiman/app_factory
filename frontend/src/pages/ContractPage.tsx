import React, 'react';
import type { Document, Signatory } from '../components/contract/contract-types';
import { DocumentStatus, SignatoryStatus } from '../components/contract/contract-types';
import DocumentViewer from '../components/contract/DocumentViewer';
import StatusTracker from '../components/contract/StatusTracker';
import SignatoryList from '../components/contract/SignatoryList';
import { DocumentIcon } from '../components/contract/icons';
import api from '../utils/api'; // To be used later
import { useState, useEffect } from 'react';

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

  if (loading) {
    return <div>Loading Contract Information...</div>;
  }

  if (error) {
    return <div className="text-red-500">Failed to edit, 0 occurrences found for old_string (const ContractPage: React.FC = () => {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  // In the future, we will fetch this data from the backend
  useEffect(() => {
    // const fetchContractData = async () => {
    //   try {
    //     // const data = await api.getContractData();
    //     // setDocument(data);
    //     setDocument(MOCK_DOCUMENT); // Using mock for now
    //   } catch (error) {
    //     console.error("Failed to fetch contract data", error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchContractData();
    setDocument(MOCK_DOCUMENT);
    setLoading(false);
  }, []);

  if (loading || !document) {
    return <div>Loading Contract Information...</div>;
  }

  return (
    // ... (rest of the JSX remains the same) ...
  );
};). Original old_string was (const ContractPage: React.FC = () => {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  // In the future, we will fetch this data from the backend
  useEffect(() => {
    // const fetchContractData = async () => {
    //   try {
    //     // const data = await api.getContractData();
    //     // setDocument(data);
    //     setDocument(MOCK_DOCUMENT); // Using mock for now
    //   } catch (error) {
    //     console.error("Failed to fetch contract data", error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchContractData();
    setDocument(MOCK_DOCUMENT);
    setLoading(false);
  }, []);

  if (loading || !document) {
    return <div>Loading Contract Information...</div>;
  }

  return (
    // ... (rest of the JSX remains the same) ...
  );
};) in /home/rimanshu/Desktop/Turning Idea/frontend/src/pages/ContractPage.tsx. No edits made. The exact text in old_string was not found. Ensure you're not escaping content incorrectly and check whitespace, indentation, and context. Use read_file tool to verify.</div>;
  }

  if (!document) {
    return <div>No contract has been issued yet.</div>;
  }

  return (
    // ... (rest of the JSX remains the same) ...
  );
};

export default ContractPage;
