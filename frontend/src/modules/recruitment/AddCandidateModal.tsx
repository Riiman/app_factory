
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { X, Upload, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AddCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    startupId: number;
    jobId: number;
}

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({ isOpen, onClose, startupId, jobId }) => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const uploadMutation = useMutation({
        mutationFn: (file: File) => api.uploadCandidate(jobId, startupId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-pipeline', jobId] });
            queryClient.invalidateQueries({ queryKey: ['job', jobId] });
            toast.success("Candidate added successfully!");
            onClose();
        },
        onError: () => {
            toast.error("Failed to upload candidate.");
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!file) return;
        setIsUploading(true);
        uploadMutation.mutate(file, {
            onSettled: () => setIsUploading(false)
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Add Candidate</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resume (PDF)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-primary transition-colors">
                        {file ? (
                            <div className="flex items-center justify-center text-brand-primary">
                                <FileText className="h-8 w-8 mr-2" />
                                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                <button onClick={() => setFile(null)} className="ml-2 text-gray-500 hover:text-red-500">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className={`px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 flex items-center ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? 'Uploading...' : 'Upload & Analyze_'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCandidateModal;
