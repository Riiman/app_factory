import React, { useState, useEffect, useCallback } from 'react';
import { Startup, ContractStatus, ContractComment, ContractSignatory, StartupStage } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { FileText, Send, CheckCircle, UserPlus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api, { getWebSocketUrl } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmationModal from '../../components/ConfirmationModal';

interface ContractViewProps {
  startupsInContract: Startup[];
  fetchData: () => Promise<void>; // Add fetchData to props
  onUpdateContract?: (startupId: number, url: string, status: ContractStatus) => void;
  onActivateStartup?: (startupId: number) => void;
}

const ContractView: React.FC<ContractViewProps> = ({ startupsInContract, onUpdateContract, onActivateStartup, fetchData }) => {
  const [selectedStartupId, setSelectedStartupId] = useState<number | null>(null);

  // Derived state - Single Source of Truth
  const selectedStartup = React.useMemo(() =>
    selectedStartupId ? startupsInContract.find(s => s.id === selectedStartupId) || null : null
    , [selectedStartupId, startupsInContract]);

  const [newSignatoryName, setNewSignatoryName] = useState('');
  const [newSignatoryEmail, setNewSignatoryEmail] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractContent, setContractContent] = useState('');

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'primary' | 'danger';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    onConfirm: async () => { },
  });

  const openModal = (
    title: string,
    message: string,
    confirmText: string,
    variant: 'primary' | 'danger',
    onConfirm: () => Promise<void>
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      onConfirm,
    });
  };

  const closeModal = () => {
    if (!isSigning) {
      setModalConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleConfirmAction = async () => {
    try {
      await modalConfig.onConfirm();
      closeModal();
    } catch (error) {
      console.error("Action failed", error);
    }
  };

  useEffect(() => {
    if (selectedStartup?.contract) {
      setContractContent(selectedStartup.contract.content);
    } else {
      setContractContent('');
    }
  }, [selectedStartup?.id, selectedStartup?.contract?.content]); // Reset when startup or content changes

  const handleSaveContract = async () => {
    if (selectedStartup && contractContent) {
      try {
        await api.updateContract(selectedStartup.id, { content: contractContent });
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
    // If no startup is selected, default to the first one
    if (!selectedStartupId && startupsInContract.length > 0) {
      setSelectedStartupId(startupsInContract[0].id);
    }
    // If selected startup disappears (e.g. stage changed), clear or reselect
    else if (selectedStartupId && !startupsInContract.find(s => s.id === selectedStartupId)) {
      setSelectedStartupId(startupsInContract.length > 0 ? startupsInContract[0].id : null);
    }
  }, [startupsInContract, selectedStartupId]);

  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartupId(startup.id);
  };

  const handleAddSignatory = useCallback(async () => {
    if (selectedStartup && newSignatoryName.trim() && newSignatoryEmail.trim()) {
      try {
        await api.addContractSignatory(selectedStartup.id, newSignatoryName.trim(), newSignatoryEmail.trim());
        setNewSignatoryName('');
        setNewSignatoryEmail('');
        fetchData();
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
        fetchData();
      } catch (error) {
        console.error("Failed to add comment:", error);
        alert("Failed to add comment.");
      }
    }
  }, [selectedStartup, newComment, fetchData]);

  const requestAcceptContract = () => {
    openModal(
      "Accept Contract",
      "Are you sure you want to accept this contract? This indicates your approval of the terms.",
      "Accept Contract",
      "primary",
      async () => {
        if (selectedStartup) {
          await api.acceptContract(selectedStartup.id);
          fetchData();
        }
      }
    );
  };

  const requestSendContract = useCallback(() => {
    openModal(
      "Send Contract",
      "Are you sure you want to send this contract to the founder? They will be notified to review and sign it.",
      "Send Contract",
      "primary",
      async () => {
        if (selectedStartup) {
          await api.updateContractStatus(selectedStartup.id, ContractStatus.SENT.valueOf());
          fetchData();
        }
      }
    );
  }, [selectedStartup, fetchData]);

  const [isSigning, setIsSigning] = useState(false);

  const requestMarkAsSigned = useCallback(() => {
    openModal(
      "Mark as Signed",
      "Are you sure you want to mark this contract as signed? This will finalize the admission process.",
      "Mark as Signed",
      "primary",
      async () => {
        if (selectedStartup) {
          try {
            setIsSigning(true);
            await api.updateContractStatus(selectedStartup.id, ContractStatus.SIGNED.valueOf());
            await api.updateStartupStage(selectedStartup.id, StartupStage.ADMITTED.valueOf());
            fetchData();
          } finally {
            setIsSigning(false);
          }
        }
      }
    );
  }, [selectedStartup, fetchData]);

  // Note: WebSocket listener removed as data updates are handled by parent component and props


  return (
    <>
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
                      onClick={requestAcceptContract}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Accept Contract
                    </button>
                  )}

                  <button
                    onClick={requestSendContract}
                    disabled={selectedStartup.contract.status !== ContractStatus.ACCEPTED}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    title={selectedStartup.contract.status !== ContractStatus.ACCEPTED ? "Both parties must accept the contract before sending." : "Send Contract"}
                  >
                    <Send className="mr-2 h-4 w-4" /> Send Contract
                  </button>
                  <button
                    onClick={requestMarkAsSigned}
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
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmAction}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        isProcessing={isSigning}
      />
    </>
  );
};

export default ContractView;