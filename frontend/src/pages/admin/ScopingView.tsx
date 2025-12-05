
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Startup, ScopeStatus } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { FileSignature, Send, Save, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import api from '../../utils/api';

interface ScopingViewProps {
  startupsInScoping: Startup[];
  onUpdateScope: (startupId: number, productScope: string, gtmScope: string) => void;
  onAddComment: (startupId: number, text: string, author: 'Admin' | 'Founder', sectionId: string) => void;
  onUpdateStatus: (startupId: number, status: ScopeStatus) => void;
}

const ScopingView: React.FC<ScopingViewProps> = ({ startupsInScoping, onUpdateScope, onAddComment, onUpdateStatus }) => {

  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [productScope, setProductScope] = useState('');
  const [gtmScope, setGtmScope] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [activeTab, setActiveTab] = useState<'product' | 'gtm'>('product');

  useEffect(() => {
    if (selectedStartup?.scope_document) {
      try {
        const content = JSON.parse(selectedStartup.scope_document.content);
        if (content.product || content.gtm) {
          setProductScope(content.product || '');
          setGtmScope(content.gtm || '');
        } else {
          // Fallback for old string content or unknown JSON
          const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          const gtmKeywords = ["Go-to-Market Strategy", "GTM Strategy", "## Go-to-Market", "## GTM"];
          let splitIndex = -1;

          for (const keyword of gtmKeywords) {
            const idx = contentStr.indexOf(keyword);
            if (idx !== -1) {
              splitIndex = idx;
              break;
            }
          }

          if (splitIndex !== -1) {
            setProductScope(contentStr.substring(0, splitIndex));
            setGtmScope(contentStr.substring(splitIndex));
          } else {
            setProductScope(contentStr);
            setGtmScope('');
          }
        }
      } catch (e) {
        // Fallback if not JSON
        const contentStr = selectedStartup.scope_document.content;
        const gtmKeywords = ["Go-to-Market Strategy", "GTM Strategy", "## Go-to-Market", "## GTM"];
        let splitIndex = -1;

        for (const keyword of gtmKeywords) {
          const idx = contentStr.indexOf(keyword);
          if (idx !== -1) {
            splitIndex = idx;
            break;
          }
        }

        if (splitIndex !== -1) {
          setProductScope(contentStr.substring(0, splitIndex));
          setGtmScope(contentStr.substring(splitIndex));
        } else {
          setProductScope(contentStr);
          setGtmScope('');
        }
      }
    } else {
      setProductScope('');
      setGtmScope('');
    }
  }, [selectedStartup]);

  const handleSaveScope = async () => {
    if (selectedStartup) {
      try {
        await onUpdateScope(selectedStartup.id, productScope, gtmScope);
        setIsEditingScope(false);
        alert("Scope updated successfully.");
      } catch (e) {
        console.error("Failed to update scope:", e);
        alert("Failed to update scope.");
      }
    }
  };

  useEffect(() => {
    if (!selectedStartup && startupsInScoping.length > 0) {
      setSelectedStartup(startupsInScoping[0]);
    }
  }, [startupsInScoping, selectedStartup]);

  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartup(startup);
  };

  const handleAddComment = () => {
    if (selectedStartup && newComment.trim()) {
      onAddComment(selectedStartup.id, newComment.trim(), 'Admin', activeTab);
      setNewComment('');
    }
  };

  const { token } = useAuth();

  // WebSocket Listener
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/dashboard-notifications?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'scope_comment_added') {
          const newComment = message.data.comment;
          const startupId = message.data.startup_id;

          if (selectedStartup && selectedStartup.id === startupId) {
            setSelectedStartup(prev => {
              if (!prev || !prev.scope_document) return prev;

              // Check if comment already exists to avoid duplicates
              if (prev.scope_document.comments.some(c => c.id === newComment.id)) {
                return prev;
              }

              return {
                ...prev,
                scope_document: {
                  ...prev.scope_document,
                  comments: [...prev.scope_document.comments, newComment]
                }
              };
            });
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [token, selectedStartup]);

  const handleUpdateStatus = async (status: ScopeStatus) => {
    if (selectedStartup) {
      try {
        setIsUpdatingStatus(true);
        await onUpdateStatus(selectedStartup.id, status);
      } catch (error) {
        console.error("Failed to update status:", error);
      } finally {
        setIsUpdatingStatus(false);
      }
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-slate-200 h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold flex items-center"><FileSignature className="mr-2 h-5 w-5" />Scoping</h2>
        </div>
        <ul>
          {startupsInScoping.map(startup => (
            <li key={startup.id}>
              <button
                onClick={() => handleSelectStartup(startup)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedStartup?.id === startup.id ? 'bg-brand-primary/5' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-brand-text-primary">{startup.name}</p>
                  {startup.scope_document && <StatusBadge status={startup.scope_document.status} />}
                </div>
                <p className="text-sm text-brand-text-secondary mt-1 truncate">{startup.founders[0]?.name || 'N/A'}</p>
                <p className="text-xs text-slate-500 truncate">{startup.founders[0]?.email}{startup.founders[0]?.mobile && ` • ${startup.founders[0]?.mobile}`}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-2/3 h-full overflow-y-auto p-8">
        {selectedStartup && selectedStartup.scope_document ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-brand-text-primary">{selectedStartup.name}</h2>
              <p className="text-brand-text-secondary mt-1">{selectedStartup.scope_document.title}</p>
            </div>

            <Card title="Founders">
              <ul>
                {selectedStartup.founders.map(founder => (
                  <li key={founder.id} className="flex items-center space-x-3 py-2 border-b last:border-0 border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-brand-secondary/20 text-brand-secondary flex items-center justify-center font-bold">
                      {founder.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-brand-text-primary">{founder.name} <span className="text-sm font-normal text-slate-500">- {founder.role}</span></p>
                      <a href={`mailto:${founder.email}`} className="text-sm text-brand-primary hover:underline">{founder.email}</a>
                      {founder.mobile && <a href={`tel:${founder.mobile}`} className="text-sm text-brand-text-secondary hover:underline block">{founder.mobile}</a>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'product' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('product')}
              >
                Product Scope
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'gtm' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('gtm')}
              >
                GTM Scope
              </button>
            </div>

            <Card title={activeTab === 'product' ? "Product Scope" : "GTM Scope"}>
              <div className="flex justify-end mb-2">
                {!isEditingScope ? (
                  <button
                    onClick={() => setIsEditingScope(true)}
                    className="text-sm text-brand-primary hover:underline font-medium"
                  >
                    Edit Scope
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setIsEditingScope(false);
                        if (selectedStartup?.scope_document) {
                          try {
                            const content = JSON.parse(selectedStartup.scope_document.content);
                            setProductScope(content.product || selectedStartup.scope_document.content);
                            setGtmScope(content.gtm || '');
                          } catch {
                            setProductScope(selectedStartup.scope_document.content);
                          }
                        }
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveScope}
                      className="text-sm text-brand-primary hover:underline font-bold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {isEditingScope ? (
                <div className="space-y-4">
                  {activeTab === 'product' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Scope</label>
                      <textarea
                        value={productScope}
                        onChange={(e) => setProductScope(e.target.value)}
                        className="w-full h-64 p-4 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        placeholder="Define the product scope..."
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GTM Scope</label>
                      <textarea
                        value={gtmScope}
                        onChange={(e) => setGtmScope(e.target.value)}
                        className="w-full h-64 p-4 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        placeholder="Define the GTM scope..."
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 prose prose-sm max-w-none">
                  {activeTab === 'product' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{productScope}</ReactMarkdown>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{gtmScope}</ReactMarkdown>
                  )}
                </div>
              )}
            </Card>

            <Card title="Discussion & Finalization">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center text-md"><MessageSquare className="mr-2 h-5 w-5" /> Comments ({activeTab === 'product' ? 'Product' : 'GTM'})</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {selectedStartup.scope_document.comments
                    .filter(comment => comment.section_id === activeTab || (!comment.section_id && activeTab === 'product'))
                    .map(comment => (
                      <div key={comment.id} className={`flex ${comment.author === 'Admin' ? 'justify-end' : ''}`}>
                        <div className={`p-3 rounded-lg max-w-md ${comment.author === 'Admin' ? 'bg-brand-primary/10 text-brand-text-primary' : 'bg-slate-100 text-brand-text-secondary'}`}>
                          <p className="text-sm">{comment.text}</p>
                          <p className="text-xs text-slate-400 mt-1 text-right">{comment.author} &bull; {new Date(comment.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  {selectedStartup.scope_document.comments.filter(comment => comment.section_id === activeTab || (!comment.section_id && activeTab === 'product')).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No comments in this section yet.</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-grow px-3 py-2 text-sm border border-slate-300 rounded-md"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComment();
                      }
                    }}
                  />
                  <button onClick={handleAddComment} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90 flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </button>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold text-md">Simulate Founder Response</h3>
                <p className="text-sm text-brand-text-secondary mb-2">Finalize the scope by marking it as accepted or rejected.</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateStatus(ScopeStatus.REJECTED)}
                    disabled={isUpdatingStatus}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStatus ? 'Processing...' : <><XCircle className="mr-2 h-4 w-4" /> Reject</>}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setIsUpdatingStatus(true);
                        await api.acceptScope(selectedStartup.id);
                        // Refresh data or update local state
                        onUpdateStatus(selectedStartup.id, ScopeStatus.ACCEPTED); // Trigger refresh
                      } catch (e) {
                        console.error("Failed to accept:", e);
                        alert("Failed to accept scope.");
                      } finally {
                        setIsUpdatingStatus(false);
                      }
                    }}
                    disabled={isUpdatingStatus || selectedStartup.scope_document.admin_accepted}
                    className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-md ${selectedStartup.scope_document.admin_accepted ? 'bg-green-800' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isUpdatingStatus ? 'Processing...' : (
                      selectedStartup.scope_document.admin_accepted ?
                        <><CheckCircle className="mr-2 h-4 w-4" /> Admin Accepted</> :
                        <><CheckCircle className="mr-2 h-4 w-4" /> Mark as Accepted</>
                    )}
                  </button>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Founder Status: {selectedStartup.scope_document.founder_accepted ? <span className="text-green-600 font-semibold">Accepted</span> : <span className="text-amber-600">Pending</span>}
                </div>
              </div>
            </Card>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileSignature className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-xl font-semibold">Select a Startup for Scoping</h2>
              <p className="text-brand-text-secondary mt-1">Choose a startup from the list to define its scope of engagement.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ScopingView;