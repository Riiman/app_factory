import React, { useState, useEffect, useCallback } from 'react';
import { Startup, ContractStatus, ContractComment, ContractSignatory, StartupStage } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { FileText, Send, CheckCircle, UserPlus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../utils/api';

interface ContractViewProps {
  startupsInContract: Startup[];
  fetchData: () => Promise<void>; // Add fetchData to props
  onUpdateContract?: (startupId: number, url: string, status: ContractStatus) => void;
  onActivateStartup?: (startupId: number) => void;
}

const ContractView: React.FC<ContractViewProps> = ({ startupsInContract, onUpdateContract, onActivateStartup, fetchData }) => {
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [newSignatoryName, setNewSignatoryName] = useState('');
  const [newSignatoryEmail, setNewSignatoryEmail] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractContent, setContractContent] = useState('');

  useEffect(() => {
    if (selectedStartup?.contract) {
      setContractContent(selectedStartup.contract.content);
    } else {
      setContractContent('');
    }
  }, [selectedStartup]);

  const handleSaveContract = async () => {
    if (selectedStartup && contractContent) {
      try {
        await api.updateContract(selectedStartup.id, contractContent);
        setIsEditingContract(false);
        alert("Contract updated successfully.");
        fetchData();
      } catch (e) {
        console.error("Failed to update contract:", e);
        alert("Failed to update contract.");
      }
    }
  };

  useEffect(() => {
    // When startupsInContract changes, try to keep the selected startup if it still exists
    if (selectedStartup) {
      const updatedSelected = startupsInContract.find(s => s.id === selectedStartup.id);
      setSelectedStartup(updatedSelected || null);
    }
  }, [startupsInContract]);

  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartup(startup);
    if (startup.contract) {

    }
  };

  const handleAddSignatory = useCallback(async () => {
    if (selectedStartup && newSignatoryName.trim() && newSignatoryEmail.trim()) {
      try {
        await api.addContractSignatory(selectedStartup.id, newSignatoryName.trim(), newSignatoryEmail.trim());
        setNewSignatoryName('');
        setNewSignatoryEmail('');
        fetchData(); // Re-fetch data to update the selected startup with new signatory
      } catch (error) {
        console.error("Failed to add signatory:", error);
        alert("Failed to add signatory.");
      }
    }
  }, [selectedStartup, newSignatoryName, newSignatoryEmail, fetchData]);

  const handleAddComment = useCallback(async () => {
    if (selectedStartup && newComment.trim()) {
      try {
        await api.addContractComment(selectedStartup.id, newComment.trim());
        setNewComment('');
        fetchData(); // Re-fetch data to update the selected startup with new comment
      } catch (error) {
        console.error("Failed to add comment:", error);
        alert("Failed to add comment.");
      }
    }
  }, [selectedStartup, newComment, fetchData]);

  const handleSendContract = useCallback(async () => {
    if (selectedStartup) {
      try {
        await api.updateContractStatus(selectedStartup.id, ContractStatus.SENT.valueOf());
        fetchData(); // Re-fetch data to update contract status
      } catch (error) {
        console.error("Failed to send contract:", error);
        alert("Failed to send contract.");
      }
    }
  }, [selectedStartup, fetchData]);

  const [isSigning, setIsSigning] = useState(false);

  const handleMarkAsSigned = useCallback(async () => {
    if (selectedStartup) {
      try {
        setIsSigning(true);
        await api.updateContractStatus(selectedStartup.id, ContractStatus.SIGNED.valueOf());
        await api.updateStartupStage(selectedStartup.id, StartupStage.ADMITTED.valueOf());
        fetchData(); // Re-fetch data to update contract status
      } catch (error) {
        console.error("Failed to mark contract as signed:", error);
        alert("Failed to mark contract as signed.");
      } finally {
        setIsSigning(false);
      }
    }
  }, [selectedStartup, fetchData]);

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-slate-200 h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold flex items-center"><FileText className="mr-2 h-5 w-5" />Contract</h2>
        </div>
        <ul>
          {startupsInContract.map(startup => (
            <li key={startup.id}>
              <button
                onClick={() => handleSelectStartup(startup)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedStartup?.id === startup.id ? 'bg-brand-primary/5' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-brand-text-primary">{startup.name}</p>
                  {startup.contract && <StatusBadge status={startup.contract.status} />}
                </div>
                <p className="text-sm text-brand-text-secondary mt-1 truncate">{startup.founders[0]?.name || 'N/A'}</p>
                <p className="text-xs text-slate-500 truncate">{startup.founders[0]?.email}{startup.founders[0]?.phone_number && ` • ${startup.founders[0]?.mobile}`}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-2/3 h-full overflow-y-auto p-8">
        {selectedStartup && selectedStartup.contract ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-brand-text-primary">{selectedStartup.name}</h2>
              <p className="text-brand-text-secondary mt-1">Review and finalize the incubator contract.</p>
            </div>

            <Card title="Contract Document">
              <div className="flex justify-end mb-2">
                {!isEditingContract ? (
                  <button
                    onClick={() => setIsEditingContract(true)}
                    className="text-sm text-brand-primary hover:underline font-medium"
                  >
                    Edit Contract
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setIsEditingContract(false);
                        setContractContent(selectedStartup.contract?.content || ''); // Reset
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveContract}
                      className="text-sm text-brand-primary hover:underline font-bold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="prose max-w-none p-4 border border-slate-300 rounded-md bg-slate-50">
                {isEditingContract ? (
                  <textarea
                    value={contractContent}
                    onChange={(e) => setContractContent(e.target.value)}
                    className="w-full h-96 p-4 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                ) : (
                  selectedStartup.contract?.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedStartup.contract.content}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-500">No contract content generated yet. Accept the scope to generate the contract.</p>
                  )
                )}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
                {!selectedStartup.contract.admin_accepted && selectedStartup.contract.status !== ContractStatus.SENT && selectedStartup.contract.status !== ContractStatus.SIGNED && (
                  <button
                    onClick={async () => {
                      if (selectedStartup) {
                        try {
                          await api.acceptContract(selectedStartup.id);
                          alert('Contract accepted successfully.');
                          fetchData();
                        } catch (e) {
                          console.error("Failed to accept contract:", e);
                          alert("Failed to accept contract.");
                        }
                      }
                    }}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Accept Contract
                  </button>
                )}

                <button
                  onClick={handleSendContract}
                  disabled={selectedStartup.contract.status !== ContractStatus.ACCEPTED}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  title={selectedStartup.contract.status !== ContractStatus.ACCEPTED ? "Both parties must accept the contract before sending." : "Send Contract"}
                >
                  <Send className="mr-2 h-4 w-4" /> Send Contract
                </button>
                <button
                  onClick={handleMarkAsSigned}
                  disabled={selectedStartup.contract.status !== ContractStatus.SENT || isSigning}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {isSigning ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Signing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Mark as Signed
                    </>
                  )}
                </button>
              </div>
              <div className="mt-2 flex justify-end space-x-4 text-sm text-slate-600">
                <span className="flex items-center">
                  Founder Accepted:
                  {selectedStartup.contract.founder_accepted ? (
                    <CheckCircle className="ml-1 h-4 w-4 text-green-500" />
                  ) : (
                    <span className="ml-1 text-slate-400">Pending</span>
                  )}
                </span>
                <span className="flex items-center">
                  Admin Accepted:
                  {selectedStartup.contract.admin_accepted ? (
                    <CheckCircle className="ml-1 h-4 w-4 text-green-500" />
                  ) : (
                    <span className="ml-1 text-slate-400">Pending</span>
                  )}
                </span>
              </div>
            </Card>

            <Card title="Signatories">
              <div className="space-y-3">
                {selectedStartup.contract.signatories.length > 0 ? (
                  selectedStartup.contract.signatories.map(signatory => (
                    <div key={signatory.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-md">
                      <div>
                        <p className="font-semibold text-brand-text-primary">{signatory.name}</p>
                        <p className="text-sm text-brand-text-secondary">{signatory.email}</p>
                      </div>
                      <StatusBadge status={signatory.status} />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No signatories added yet.</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t flex flex-col space-y-3">
                <h3 className="font-semibold flex items-center text-md"><UserPlus className="mr-2 h-5 w-5" /> Add New Signatory</h3>
                <input
                  type="text"
                  value={newSignatoryName}
                  onChange={e => setNewSignatoryName(e.target.value)}
                  placeholder="Signatory Name"
                  className="w-full p-2 border border-slate-300 rounded-md text-sm"
                />
                <input
                  type="email"
                  value={newSignatoryEmail}
                  onChange={e => setNewSignatoryEmail(e.target.value)}
                  placeholder="Signatory Email"
                  className="w-full p-2 border border-slate-300 rounded-md text-sm"
                />
                <button onClick={handleAddSignatory} className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-brand-secondary/90">
                  <UserPlus className="mr-2 h-4 w-4" /> Add Signatory
                </button>
              </div>
            </Card>

            <Card title="Discussion">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center text-md"><MessageSquare className="mr-2 h-5 w-5" /> Comments</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {selectedStartup.contract.comments.length > 0 ? (
                    selectedStartup.contract.comments.map(comment => (
                      <div key={comment.id} className={`flex ${comment.user_id === 1 ? 'justify-end' : ''}`}> {/* Assuming admin user_id is 1 for now */}
                        <div className={`p-3 rounded-lg max-w-md ${comment.user_id === 1 ? 'bg-brand-primary/10 text-brand-text-primary' : 'bg-slate-100 text-brand-text-secondary'}`}>
                          <p className="text-sm font-semibold">{comment.author_name}</p>
                          <p className="text-sm">{comment.text}</p>
                          <p className="text-xs text-slate-400 mt-1 text-right">{new Date(comment.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-grow px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <button onClick={handleAddComment} className="px-3 py-2 text-sm font-medium text-brand-primary rounded-md border border-brand-primary/50 hover:bg-brand-primary/5">Add Comment</button>
                </div>
              </div>
            </Card>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-xl font-semibold">Select a Startup for Contract Management</h2>
              <p className="text-brand-text-secondary mt-1">Choose a startup from the list to manage its incubator contract.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractView;