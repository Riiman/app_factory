
import React, { useState, useMemo, useEffect } from 'react';
import { Startup, ScopeStatus } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { FileSignature, Send, Save, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ScopingViewProps {
  startupsInScoping: Startup[];
  onUpdateScope: (startupId: number, productScope: string, gtmScope: string) => void;
  onAddComment: (startupId: number, text: string, author: 'Admin' | 'Founder') => void;
  onUpdateStatus: (startupId: number, status: ScopeStatus) => void;
}

const ScopingView: React.FC<ScopingViewProps> = ({ startupsInScoping, onUpdateScope, onAddComment, onUpdateStatus }) => {
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [productScope, setProductScope] = useState('');
  const [gtmScope, setGtmScope] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (selectedStartup?.scope_document) {
      // The entire document content is now in a single field.
      // Splitting it for display is no longer necessary.
      // We will render the raw markdown content directly.
      setProductScope(selectedStartup.scope_document.content);
      setGtmScope(''); // Clear this as it's no longer a separate field
    } else {
        setProductScope('');
        setGtmScope('');
    }
  }, [selectedStartup]);

  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartup(startup);
  };

  const handleSaveDraft = () => {
    if (selectedStartup) {
      onUpdateScope(selectedStartup.id, productScope, gtmScope);
    }
  };

  const handleAddComment = (author: 'Admin' | 'Founder') => {
      if(selectedStartup && newComment.trim()) {
          onAddComment(selectedStartup.id, newComment.trim(), author);
          setNewComment('');
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
            
            <Card title="Scope of Engagement">
                <div className="space-y-4 prose max-w-none">
                    <ReactMarkdown>{selectedStartup.scope_document.content}</ReactMarkdown>
                </div>
            </Card>

            <Card title="Discussion & Finalization">
                <div className="space-y-4">
                    <h3 className="font-semibold flex items-center text-md"><MessageSquare className="mr-2 h-5 w-5" /> Comments</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {selectedStartup.scope_document.comments.map(comment => (
                            <div key={comment.id} className={`flex ${comment.author === 'Admin' ? 'justify-end' : ''}`}>
                                <div className={`p-3 rounded-lg max-w-md ${comment.author === 'Admin' ? 'bg-brand-primary/10 text-brand-text-primary' : 'bg-slate-100 text-brand-text-secondary'}`}>
                                    <p className="text-sm">{comment.text}</p>
                                    <p className="text-xs text-slate-400 mt-1 text-right">{comment.author} &bull; {new Date(comment.createdAt).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t">
                         <input
                            type="text"
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-grow px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                        <button onClick={() => handleAddComment('Admin')} className="px-3 py-2 text-sm font-medium text-brand-primary rounded-md border border-brand-primary/50 hover:bg-brand-primary/5">Admin</button>
                        <button onClick={() => handleAddComment('Founder')} className="px-3 py-2 text-sm font-medium text-brand-secondary rounded-md border border-brand-secondary/50 hover:bg-brand-secondary/5">Founder</button>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t">
                    <h3 className="font-semibold text-md">Simulate Founder Response</h3>
                    <p className="text-sm text-brand-text-secondary mb-2">Finalize the scope by marking it as accepted or rejected.</p>
                     <div className="flex space-x-2">
                        <button onClick={() => onUpdateStatus(selectedStartup.id, ScopeStatus.REJECTED)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                           <XCircle className="mr-2 h-4 w-4" /> Mark as Rejected
                        </button>
                        <button onClick={() => onUpdateStatus(selectedStartup.id, ScopeStatus.ACCEPTED)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Accepted
                        </button>
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