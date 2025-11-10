
import React, { useState, useEffect } from 'react';
import { Startup, ContractStatus } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { FileText, Save, Send, CheckCircle, Rocket } from 'lucide-react';

interface ContractViewProps {
  startupsInContract: Startup[];
  onUpdateContract: (startupId: number, url: string, status: ContractStatus) => void;
  onActivateStartup: (startupId: number) => void;
}

const ContractView: React.FC<ContractViewProps> = ({ startupsInContract, onUpdateContract, onActivateStartup }) => {
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    if (selectedStartup?.contract) {
      setDocumentUrl(selectedStartup.contract.documentUrl);
    } else {
      setDocumentUrl('');
    }
  }, [selectedStartup]);
  
  const handleSelectStartup = (startup: Startup) => {
    setSelectedStartup(startup);
  };

  const handleStatusUpdate = (status: ContractStatus) => {
    if (selectedStartup) {
      onUpdateContract(selectedStartup.id, documentUrl, status);
    }
  };

  const isSigned = selectedStartup?.contract?.status === ContractStatus.SIGNED;

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
                <p className="text-xs text-slate-500 truncate">{startup.founders[0]?.email}{startup.founders[0]?.mobile && ` • ${startup.founders[0]?.mobile}`}</p>
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
                    <p className="text-brand-text-secondary mt-1">Manage contract and activate startup.</p>
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

                <Card title="Contract Details">
                     <div>
                        <label className="text-sm font-medium text-brand-text-primary" htmlFor="contract-url">Contract Document URL</label>
                        <input
                            id="contract-url"
                            type="text"
                            value={documentUrl}
                            onChange={(e) => setDocumentUrl(e.target.value)}
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm"
                            placeholder="https://example.com/contract.pdf"
                        />
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium mr-2">Status:</span>
                            <StatusBadge status={selectedStartup.contract.status} />
                        </div>
                        <div className="flex space-x-2">
                             <button onClick={() => handleStatusUpdate(ContractStatus.DRAFT)} className="flex items-center px-4 py-2 text-sm font-medium text-brand-text-primary bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                                <Save className="mr-2 h-4 w-4" /> Save as Draft
                            </button>
                            <button onClick={() => handleStatusUpdate(ContractStatus.SENT)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                <Send className="mr-2 h-4 w-4" /> Mark as Sent
                            </button>
                            <button onClick={() => handleStatusUpdate(ContractStatus.SIGNED)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Signed
                            </button>
                        </div>
                    </div>
                </Card>

                <Card title="Activation">
                    <p className="text-sm text-brand-text-secondary mb-4">Once the contract is signed, you can activate the startup. This will move them into the main directory and begin the active program.</p>
                    <button 
                        onClick={() => onActivateStartup(selectedStartup.id)}
                        disabled={!isSigned}
                        className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        <Rocket className="mr-2 h-5 w-5" /> Activate Startup
                    </button>
                    {!isSigned && <p className="text-xs text-center text-red-500 mt-2">Activation requires the contract to be marked as 'SIGNED'.</p>}
                </Card>
            </div>
        ) : (
             <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h2 className="mt-4 text-xl font-semibold">Select a Startup for Contract</h2>
                    <p className="text-brand-text-secondary mt-1">Choose a startup from the list to manage its contract.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ContractView;