import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Contract } from '@/types/dashboard-types';
import { ContractStatus } from '@/types/dashboard-types';
import DocumentViewer from '@/components/contract/DocumentViewer';
import SignatoryList from '@/components/contract/SignatoryList';
import { DocumentIcon } from '@/components/contract/icons';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/layout/DashboardHeader';

const ContractPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { startupStage, refreshUser } = useAuth();

  const { data: document, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['contract'],
    queryFn: api.getContractDetails,
    retry: 1,
  });

  const error = queryError ? (queryError as Error).message || 'Failed to load contract details.' : null;

  useEffect(() => {
    if (startupStage === 'ADMITTED') {
      navigate('/dashboard');
    }
  }, [startupStage, navigate]);

  const handleSignDocument = useCallback(async () => {
    if (!document) return;
    try {
      await api.signDocument(document.id);
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      alert('Document signed successfully!');
    } catch (err) {
      console.error('Failed to sign document:', err);
      alert('Failed to sign document. Please try again.');
    }
  }, [document, queryClient]);

  const [newComment, setNewComment] = useState('');
  const [newSignatoryName, setNewSignatoryName] = useState('');
  const [newSignatoryEmail, setNewSignatoryEmail] = useState('');

  const handleAcceptContract = async () => {
    if (!document) return;
    try {
      await api.acceptContract();
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      alert('Contract accepted successfully.');
      await refreshUser();
    } catch (e) {
      console.error("Failed to accept contract:", e);
      alert("Failed to accept contract.");
    }
  };

  const handleAddComment = async () => {
    if (!document || !newComment.trim()) return;
    try {
      await api.addContractCommentFounder(newComment);
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      setNewComment('');
    } catch (e) {
      console.error("Failed to add comment:", e);
      alert("Failed to add comment.");
    }
  };

  const handleAddSignatory = async () => {
    if (!document || !newSignatoryName.trim() || !newSignatoryEmail.trim()) return;
    try {
      await api.addContractSignatoryFounder(newSignatoryName, newSignatoryEmail);
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      setNewSignatoryName('');
      setNewSignatoryEmail('');
    } catch (e) {
      console.error("Failed to add signatory:", e);
      alert("Failed to add signatory.");
    }
  };

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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <DashboardHeader />
      <div className="p-8 flex-grow">
        <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <DocumentIcon className="w-8 h-8 mr-3 text-indigo-600" />
              {document.title}
            </h1>
            <div className="flex items-center space-x-4">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${document.status === ContractStatus.SIGNED ? 'bg-green-100 text-green-800' :
                document.status === ContractStatus.SENT ? 'bg-amber-100 text-amber-800' :
                  document.status === ContractStatus.ACCEPTED ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                }`}>{document.status}</span>

              {!document.founder_accepted && document.status !== ContractStatus.SENT && document.status !== ContractStatus.SIGNED && (
                <button
                  onClick={handleAcceptContract}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Accept Contract
                </button>
              )}
              {document.founder_accepted && document.status !== ContractStatus.SENT && document.status !== ContractStatus.SIGNED && (
                <span className="text-sm text-green-600 font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Accepted
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Document Preview</h2>
                <DocumentViewer document={document} />
              </div>

              {/* Sign Document Button (Only if SENT) */}
              {document.status === ContractStatus.SENT && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSignDocument}
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Sign Document
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Signatories */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Signatories</h2>
                <SignatoryList document={document} />

                {document.status !== ContractStatus.SIGNED && document.status !== ContractStatus.SENT && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Add Signatory</h3>
                    <input
                      type="text"
                      value={newSignatoryName}
                      onChange={(e) => setNewSignatoryName(e.target.value)}
                      placeholder="Name"
                      className="w-full p-2 border border-slate-300 rounded text-sm"
                    />
                    <input
                      type="email"
                      value={newSignatoryEmail}
                      onChange={(e) => setNewSignatoryEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full p-2 border border-slate-300 rounded text-sm"
                    />
                    <button
                      onClick={handleAddSignatory}
                      className="w-full py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-700"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Comments</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {document.comments && document.comments.length > 0 ? (
                    document.comments.map(comment => (
                      <div key={comment.id} className="bg-slate-50 p-3 rounded text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-slate-700">{comment.author_name}</span>
                          <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">No comments yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPage;