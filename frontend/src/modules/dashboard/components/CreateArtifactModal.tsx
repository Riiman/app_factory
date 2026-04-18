/**
 * @file CreateArtifactModal.tsx
 * @description A modal component with a form for creating a new artifact (File, Link, or Text).
 * The form dynamically changes the input field for the artifact's location based on its type.
 * Supports file uploads to S3 with drag-and-drop and progress tracking.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, File as FileIcon } from 'lucide-react';
import { Artifact, ArtifactType, Scope, LinkedEntityType } from '@/types/dashboard-types';
import api from '@/utils/api';

type LinkableItem = { id: number; name: string };

/**
 * Props for the CreateArtifactModal component.
 * @interface CreateArtifactModalProps
 */
interface CreateArtifactModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new artifact data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Artifact, 'id' | 'startup_id' | 'created_at'>} artifactData - The new artifact data for the backend.
     */
    onCreate: (artifactData: Omit<Artifact, 'id' | 'startup_id' | 'created_at'>) => void;
    /** An object containing lists of items that the artifact can be linked to, keyed by scope. */
    linkableItems: Record<Scope, LinkableItem[]>;
    /** Optional default scope to pre-select. */
    defaultScope?: Scope;
    /** Optional default linked entity ID to pre-select. */
    defaultLinkedToId?: number;
    /** Venture ID for file uploads */
    startupId: number;
}

const CreateArtifactModal: React.FC<CreateArtifactModalProps> = ({
    onClose,
    onCreate,
    linkableItems,
    defaultScope,
    defaultLinkedToId,
    startupId
}) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ArtifactType>(ArtifactType.LINK);
    const [location, setLocation] = useState('');
    const [scope, setScope] = useState<Scope>(defaultScope || Scope.GENERAL);
    const [linkedToId, setLinkedToId] = useState<string>(defaultLinkedToId?.toString() || '');
    const [availableLinks, setAvailableLinks] = useState<LinkableItem[]>([]);

    // File upload state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Effect to update linkable items when scope changes or defaults are provided. */
    useEffect(() => {
        if (defaultScope && defaultLinkedToId) {
            setScope(defaultScope);
            setLinkedToId(defaultLinkedToId.toString());
            setAvailableLinks(linkableItems[defaultScope] || []);
        } else {
            setLinkedToId('');
            if (scope === Scope.GENERAL) {
                setAvailableLinks([]);
            } else {
                console.log(`[CreateArtifactModal] Updating available links for scope: ${scope}`, linkableItems[scope]);
                setAvailableLinks(linkableItems[scope] || []);
            }
        }
    }, [scope, linkableItems, defaultScope, defaultLinkedToId]);

    /** Handle file selection */
    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        setSelectedFiles(prev => [...prev, ...newFiles]);

        // Auto-name only if it's the first file and name is empty
        if (!name && newFiles.length > 0) {
            if (newFiles.length === 1) {
                setName(newFiles[0].name);
            } else {
                setName(`Collection - ${new Date().toLocaleDateString()}`);
            }
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    /** Handle drag and drop */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files);
        }
    };

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for mandatory fields
        if (!name.trim()) {
            alert('Please enter an artifact name.');
            return;
        }

        // Handle FILE type uploads
        if (type === ArtifactType.FILE) {
            if (selectedFiles.length === 0) {
                alert('Please select at least one file to upload.');
                return;
            }

            setIsUploading(true);
            try {
                const formData = new FormData();
                // Append all selected files using the same key 'file'
                // Backend will use request.files.getlist('file') to retrieve them
                selectedFiles.forEach(file => {
                    formData.append('file', file);
                });

                formData.append('name', name);
                formData.append('scope', scope);
                if (description) formData.append('description', description);
                if (linkedToId) {
                    formData.append('linked_to_id', linkedToId);
                    let linked_to_type: LinkedEntityType | undefined;
                    switch (scope) {
                        case Scope.PRODUCT: linked_to_type = 'Product'; break;
                        case Scope.FUNDRAISING: linked_to_type = 'FundingRound'; break;
                        case Scope.MARKETING: linked_to_type = 'MarketingCampaign'; break;
                    }
                    if (linked_to_type) {
                        formData.append('linked_to_type', linked_to_type);
                    }
                }

                const artifact = await api.createArtifactWithFile(
                    startupId,
                    formData,
                    (progress) => setUploadProgress(progress)
                );

                onCreate(artifact as any); // API returns full artifact, onCreate expects Omit type
                onClose();
            } catch (error) {
                console.error('File upload failed:', error);
                alert('Failed to upload file. Please try again.');
            } finally {
                setIsUploading(false);
                setUploadProgress(0);
            }
            return;
        }

        // Handle LINK and TEXT types (existing logic)
        if (!location.trim()) {
            alert(type === 'text' ? 'Please enter the content.' : 'Please enter the location/URL.');
            return;
        }

        let linked_to_type: LinkedEntityType | undefined;
        switch (scope) {
            case Scope.PRODUCT: linked_to_type = 'Product'; break;
            case Scope.FUNDRAISING: linked_to_type = 'FundingRound'; break;
            case Scope.MARKETING: linked_to_type = 'MarketingCampaign'; break;
            default: linked_to_type = undefined;
        }

        onCreate({
            name,
            description,
            type,
            location,
            scope,
            linked_to_id: linkedToId ? parseInt(linkedToId, 10) : undefined,
            linked_to_type,
        });
    };

    const scopeOptions = [Scope.GENERAL, Scope.PRODUCT, Scope.FUNDRAISING, Scope.MARKETING];

    /** Renders the correct input field based on the selected artifact type. */
    const renderLocationInput = () => {
        switch (type) {
            case ArtifactType.LINK:
                return <input type="url" placeholder="https://..." value={location} onChange={e => setLocation(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />;
            case ArtifactType.TEXT:
                return <textarea value={location} onChange={e => setLocation(e.target.value)} required rows={5} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>;
            case ArtifactType.FILE:
                return (
                    <div className="mt-1">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple // Allow multiple files
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.zip"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging
                                ? 'border-brand-primary bg-brand-primary/5'
                                : 'border-gray-300 hover:border-brand-primary'
                                }`}
                        >
                            <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                            <p className="text-sm text-gray-600">
                                Click or drag files here
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Max 16MB each
                            </p>
                        </div>

                        {/* Selected Files List */}
                        {selectedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">Selected Files ({selectedFiles.length})</p>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {selectedFiles.map((file, index) => (
                                        <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-200">
                                            <div className="flex items-center space-x-2 truncate">
                                                <FileIcon className="text-brand-primary flex-shrink-0" size={16} />
                                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                                <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {uploadProgress > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Uploading...</span>
                                    <span>{Math.round(uploadProgress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Artifact</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Artifact Name <span className="text-red-500">*</span></label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            {selectedFiles.length > 1 && <p className="text-xs text-gray-500 mt-1">This will be the name of the collection.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type <span className="text-red-500">*</span></label>
                                <select value={type} onChange={e => setType(e.target.value as ArtifactType)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {Object.values(ArtifactType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    {type === ArtifactType.FILE ? 'File(s)' : type === ArtifactType.TEXT ? 'Content' : 'Location'}
                                    <span className="text-red-500">*</span>
                                </label>
                                {renderLocationInput()}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Scope <span className="text-red-500">*</span></label>
                                <select value={scope} onChange={e => setScope(e.target.value as Scope)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {scopeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Link To</label>
                                <select value={linkedToId} onChange={e => setLinkedToId(e.target.value)} disabled={scope === Scope.GENERAL} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm disabled:bg-gray-100">
                                    <option value="">{scope === Scope.GENERAL ? 'N/A' : (availableLinks.length > 0 ? `Select ${scope}...` : `No ${scope}s found`)}</option>
                                    {availableLinks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50" disabled={isUploading}>Cancel</button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Create Artifact'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateArtifactModal;