/**
 * @file ExperimentDetailModal.tsx
 * @description A modal component to display the detailed information of a single experiment.
 * It shows the experiment's description, hypothesis, validation method, results, and linked entity.
 */

import React from 'react';
import { Experiment, ExperimentStatus } from '../types';
import { X, Beaker, HelpCircle, ClipboardCheck, CheckCircle, Link as LinkIcon, FileText } from 'lucide-react';

/**
 * Props for the ExperimentDetailModal component.
 * @interface ExperimentDetailModalProps
 */
interface ExperimentDetailModalProps {
    /** The experiment object containing all details to be displayed. The backend should provide an object conforming to the `Experiment` interface. */
    experiment: Experiment;
    /** The resolved name of the entity the experiment is linked to. */
    linkedEntityName: string | null;
    /** Callback function to close the modal. */
    onClose: () => void;
}

const getStatusClasses = (status: ExperimentStatus) => {
    switch (status) {
        case ExperimentStatus.PLANNED: return { bg: 'bg-gray-100', text: 'text-gray-800' };
        case ExperimentStatus.RUNNING: return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
        case ExperimentStatus.COMPLETED: return { bg: 'bg-green-100', text: 'text-green-800' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
};

const DetailItem: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 text-gray-500 mr-4 mt-1 flex-shrink-0" />
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <div className="text-md text-gray-800">{children}</div>
        </div>
    </div>
);

const ExperimentDetailModal: React.FC<ExperimentDetailModalProps> = ({ experiment, linkedEntityName, onClose }) => {
    const statusClasses = getStatusClasses(experiment.status);
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center">
                        <Beaker className="h-6 w-6 text-brand-secondary mr-3" />
                        <h2 className="text-xl font-bold text-gray-900 truncate pr-4">{experiment.name}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailItem icon={Beaker} label="Status">
                            <span className={`px-2 py-0.5 text-sm font-semibold rounded-md ${statusClasses.bg} ${statusClasses.text}`}>
                                {experiment.status}
                            </span>
                        </DetailItem>
                        {linkedEntityName && (
                            <DetailItem icon={LinkIcon} label="Linked To">
                                <div className="font-semibold text-brand-primary">{linkedEntityName}</div>
                            </DetailItem>
                        )}
                    </div>
                     <div className="space-y-6 border-t border-gray-200 pt-6">
                        <DetailItem icon={FileText} label="Description">
                            <p className="whitespace-pre-wrap">{experiment.description}</p>
                        </DetailItem>
                        <DetailItem icon={HelpCircle} label="Assumption / Hypothesis">
                            <p className="whitespace-pre-wrap font-medium">{experiment.assumption}</p>
                        </DetailItem>
                        <DetailItem icon={ClipboardCheck} label="Validation Method">
                            <p className="whitespace-pre-wrap">{experiment.validation_method}</p>
                        </DetailItem>
                         <DetailItem icon={CheckCircle} label="Result">
                            <p className="whitespace-pre-wrap italic">{experiment.result || 'No results recorded yet.'}</p>
                        </DetailItem>
                    </div>
                </div>

                <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium">
                        Edit Experiment
                    </button>
                    <button className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 text-sm font-medium">
                        Log Results
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ExperimentDetailModal;