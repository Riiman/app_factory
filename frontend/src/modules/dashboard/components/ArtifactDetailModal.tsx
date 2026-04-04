import React, { useState } from 'react';
import { Artifact, ArtifactType } from '@/types/dashboard-types';
import { X, FileText, Link as LinkIcon, MessageSquare, Tag, Download, Loader2 } from 'lucide-react';
import api from '@/utils/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useQueryClient } from '@tanstack/react-query';

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
    const [isDownloading, setIsDownloading] = useState(false);
    const [childArtifacts, setChildArtifacts] = useState<Artifact[]>([]);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const queryClient = useQueryClient();

    // Fetch children if it's a collection
    React.useEffect(() => {
        if (artifact.type === ArtifactType.TEXT && artifact.location === 'COLLECTION') {
            setLoadingChildren(true);
            // We can reuse the getArtifacts API and filter, but we need the startupId.
            // A better way would be a specific endpoint, but let's try to fetch all and filter for now
            // or assume we can pass them. fetching is safer.
            api.getArtifacts(artifact.startup_id).then(allArtifacts => {
                const children = allArtifacts.filter((a: any) =>
                    a.linked_to_type === 'Artifact' &&
                    a.linked_to_id === artifact.id
                );
                setChildArtifacts(children);
            }).catch(err => {
                console.error("Failed to fetch child artifacts", err);
            }).finally(() => {
                setLoadingChildren(false);
            });
        } else {
            setChildArtifacts([]); // Clear child artifacts if the artifact is not a collection
        }
    }, [artifact]);

    const handleDownload = async (targetArtifact: Artifact) => {
        if (targetArtifact.type !== ArtifactType.FILE) return;

        // Use a local loading state map if we want per-button loading, 
        // but for simplicity reusing global or just rely on browser behavior for new tab.
        // We'll just open it.
        try {
            const data = await api.getArtifactDownloadUrl(targetArtifact.startup_id, targetArtifact.id);
            if (data.download_url) {
                window.open(data.download_url, '_blank');
            } else {
                alert('Could not generate download link.');
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file.');
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.deleteArtifact(artifact.startup_id, artifact.id);
            // Invalidate specifically with startup_id to ensure the list updates
            await queryClient.invalidateQueries({ queryKey: ['artifacts'] });
            // Also try invalidating with the specific ID just in case the list uses that
            await queryClient.invalidateQueries({ queryKey: ['artifacts', artifact.startup_id] });
            onClose();
        } catch (error) {
            console.error('Failed to delete artifact:', error);
            alert('Failed to delete artifact');
        } finally {
            setIsDeleting(false);
        }
    };

    const renderLocation = () => {
        // Special Case: Collection
        if (artifact.type === ArtifactType.TEXT && artifact.location === 'COLLECTION') {
            if (loadingChildren) {
                return <div className="text-gray-500 text-sm">Loading files...</div>;
            }

            if (childArtifacts.length === 0) {
                return <div className="text-gray-500 text-sm">No files in this collection.</div>;
            }

            return (
                <div className="space-y-2 mt-2">
                    {childArtifacts.map(child => (
                        <div key={child.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-200">
                            <div className="flex items-center space-x-2 truncate">
                                <FileText className="text-brand-primary flex-shrink-0" size={16} />
                                <span className="text-sm text-gray-700 truncate">{child.name}</span>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                    {child.file_size ? `(${(child.file_size / 1024).toFixed(0)} KB)` : ''}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDownload(child)}
                                className="text-brand-primary hover:text-brand-primary/80 p-1"
                                title="Download"
                            >
                                <Download size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            );
        }

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
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border">
                        <span className="font-mono text-sm truncate mr-2">{artifact.location.split('/').pop()}</span>
                        <button
                            onClick={() => handleDownload(artifact)}
                            disabled={isDownloading}
                            className="flex items-center text-sm text-brand-primary hover:text-brand-primary/80 font-medium px-3 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin mr-1" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download size={14} className="mr-1" />
                                    Download
                                </>
                            )}
                        </button>
                    </div>
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
                                {artifact.type === ArtifactType.TEXT && artifact.location === 'COLLECTION' ? 'Collection' : artifact.type.toLowerCase()}
                            </span>
                        </DetailItem>
                        {linkedEntityName && (
                            <DetailItem icon={LinkIcon} label="Linked To">
                                <div className="font-semibold text-brand-primary">{linkedEntityName}</div>
                            </DetailItem>
                        )}
                        {artifact.file_size && (
                            <DetailItem icon={FileText} label="Total Size">
                                <span>{(artifact.file_size / 1024).toFixed(2)} KB</span>
                            </DetailItem>
                        )}
                    </div>
                    <div className="space-y-6 border-t border-gray-200 pt-6">
                        <DetailItem icon={FileText} label="Description">
                            <p className="whitespace-pre-wrap">{artifact.description || 'No description provided.'}</p>
                        </DetailItem>
                        <DetailItem icon={ArtifactIcon} label={artifact.location === 'COLLECTION' ? 'Files in Collection' : 'Content / Location'}>
                            {renderLocation()}
                        </DetailItem>
                    </div>
                </div>
                <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl flex justify-between space-x-3">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm font-medium"
                    >
                        Delete
                    </button>
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium">
                        Edit Artifact
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Artifact"
                message="Are you sure you want to delete this artifact? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                isProcessing={isDeleting}
            />

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