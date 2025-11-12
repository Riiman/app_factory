/**
 * @file ArtifactsPage.tsx
 * @description A page component that provides a global view of all artifacts (files, links, text notes).
 * It displays them in a table format, where each row is clickable to open a detail modal.
 */

import React from 'react';
import { Artifact, ArtifactType, LinkedEntityType } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus, FileText, Link as LinkIcon, MessageSquare } from 'lucide-react';

/**
 * Props for the ArtifactsPage component.
 * @interface ArtifactsPageProps
 */
interface ArtifactsPageProps {
    /** An array of all artifact objects to be displayed. The backend should provide an array of `Artifact` objects. */
    artifacts: Artifact[];
    /** Callback function triggered when an artifact row is clicked. */
    onArtifactClick: (artifact: Artifact) => void;
    /** A utility function passed from the parent to resolve the name of a linked entity. */
    getLinkedEntityName: (type?: LinkedEntityType, id?: number) => string | null;
    /** Callback function triggered when the "Add New Artifact" button is clicked. */
    onAddNewArtifact: () => void;
}

const ArtifactIcon: React.FC<{ type: ArtifactType }> = ({ type }) => {
    switch (type) {
        case ArtifactType.FILE: return <FileText className="h-5 w-5 text-gray-500" />;
        case ArtifactType.LINK: return <LinkIcon className="h-5 w-5 text-gray-500" />;
        case ArtifactType.TEXT: return <MessageSquare className="h-5 w-5 text-gray-500" />;
        default: return null;
    }
};

const ArtifactsPage: React.FC<ArtifactsPageProps> = ({ artifacts, onArtifactClick, getLinkedEntityName, onAddNewArtifact }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Artifacts</h1>
                <button 
                    onClick={onAddNewArtifact}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add New Artifact</span>
                </button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked To</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {artifacts.map((artifact) => (
                                <tr key={artifact.id} onClick={() => onArtifactClick(artifact)} className="cursor-pointer hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="mr-3 flex-shrink-0"><ArtifactIcon type={artifact.type} /></div>
                                            <div className="text-sm font-medium text-gray-900">{artifact.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{artifact.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {getLinkedEntityName(artifact.linked_to_type, artifact.linked_to_id) || 'General'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(artifact.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ArtifactsPage;