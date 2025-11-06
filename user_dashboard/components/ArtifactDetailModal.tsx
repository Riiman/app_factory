/**
 * @file ArtifactDetailModal.tsx
 * @description A modal component to display the detailed information of a single artifact.
 * It intelligently renders the artifact's location based on its type (e.g., a clickable link for URLs).
 */

import React from 'react';
import { Artifact, ArtifactType } from '../types';
import { X, FileText, Link as LinkIcon, MessageSquare, Tag } from 'lucide-react';

/**
 * Props for the ArtifactDetailModal component.
 * @interface ArtifactDetailModalProps
 */
interface ArtifactDetailModalProps {
    /** The artifact object containing all details to be displayed. The backend should provide an object conforming to the `Artifact` interface. */
    artifact: Artifact;
    /** The resolved name of the entity the artifact is linked to. */
    linkedEntityName: string | null;
    /** Callback function to close the modal. */
    onClose: () => void;
}

const DetailItem: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 text-gray-500 mr-4 mt-1 flex-shrink-0" />
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <div className="text-md text-gray-800">{children}</div>
        </div>
    </div>
);

const ArtifactIcon: React.FC<{ type: ArtifactType, className?: string }> = ({ type, className = "h-6 w-6 text-brand-secondary" }) => {
    switch (type) {
        case ArtifactType.FILE: return <FileText className={className} />;
        case ArtifactType.LINK: return <LinkIcon className={className} />;
        case ArtifactType.TEXT: return <MessageSquare className={className} />;
        default: return null;
    }
};


const ArtifactDetailModal: React.FC<ArtifactDetailModalProps> = ({ artifact, linkedEntityName, onClose }) => {

    const renderLocation = () => {
        switch (artifact.type) {
            case ArtifactType.LINK:
                return (
                    <a href={artifact.location} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline break-all">
                        {artifact.location}
                    </a>
                );
            case ArtifactType.TEXT:
                return (
                    <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md border text-sm">{artifact.location}</p>
                );
            case ArtifactType.FILE:
                return (
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">{artifact.location}</p>
                );
            default:
                return <p>{artifact.location}</p>;
        }
    }
    
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
                        <ArtifactIcon type={artifact.type} className="h-6 w-6 text-brand-secondary mr-3" />
                        <h2 className="text-xl font-bold text-gray-900 truncate pr-4">{artifact.name}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailItem icon={Tag} label="Type">
                            <span className="px-2 py-0.5 text-sm font-semibold rounded-md bg-gray-100 text-gray-800 capitalize">
                                {artifact.type.toLowerCase()}
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
                            <p className="whitespace-pre-wrap">{artifact.description || 'No description provided.'}</p>
                        </DetailItem>
                        <DetailItem icon={ArtifactIcon} label="Content / Location">
                           {renderLocation()}
                        </DetailItem>
                    </div>
                </div>
                 <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium">
                        Edit Artifact
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

export default ArtifactDetailModal;