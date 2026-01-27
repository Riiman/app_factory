import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface ImportTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
    const [sourceType, setSourceType] = useState<'standard' | 'tally'>('standard');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['Date', 'Type', 'Amount', 'Payment Account', 'Category', 'Description', 'Reference'];
        const rows = [
            ['2025-01-30', 'EXPENSE', '150.00', 'Main Business Checking', 'Office Supplies', 'Printer Paper', 'INV-001'],
            ['2025-01-31', 'INCOME', '5000.00', 'Main Business Checking', 'Sales Revenue', 'Consulting Project', 'INV-002']
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transaction_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async () => {
        if (!file || !user?.startup_id) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', sourceType);

        try {
            const response = await api.post(`/startups/${user.startup_id}/accounting/import-transactions`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setResult({
                success: response.data.success_count,
                errors: response.data.errors
            });

            if (response.data.success_count > 0) {
                toast.success(`Successfully imported ${response.data.success_count} transactions!`);
                queryClient.invalidateQueries({ queryKey: ['journal'] });
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
            }

        } catch (error: any) {
            console.error(error);
            const errorData = error.response?.data;
            if (errorData?.errors) {
                setResult({
                    success: errorData.success_count || 0,
                    errors: errorData.errors
                });
            } else {
                toast.error(error.message || "Failed to import file.");
            }
        } finally {
            setIsUploading(false);
        }
    };

    const acceptedExtensions = sourceType === 'standard' ? '.csv' : '.xml,.csv';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Import Transactions</h2>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Source Selection */}
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => { setSourceType('standard'); setFile(null); setResult(null); }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${sourceType === 'standard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Standard CSV
                        </button>
                        <button
                            onClick={() => { setSourceType('tally'); setFile(null); setResult(null); }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${sourceType === 'tally' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Tally Prime Export
                        </button>
                    </div>

                    {/* Step 1: Template (Only for Standard) */}
                    {sourceType === 'standard' && (
                        <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-900">Step 1: Download Template</h3>
                                <p className="text-sm text-blue-700 mt-1">Use our CSV template to ensure your data is formatted correctly.</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="mt-2 text-sm font-medium text-blue-700 underline hover:text-blue-800"
                                >
                                    Download CSV Template
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tally Instructions */}
                    {sourceType === 'tally' && (
                        <div className="bg-amber-50 p-4 rounded-lg flex items-start gap-3">
                            <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-amber-900">Instructions</h3>
                                <p className="text-sm text-amber-800 mt-1">
                                    Export your 'Day Book' or 'Vouchers' from Tally Prime in XML format.
                                    Ensure the export includes 'All Vouchers'.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Upload */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-2">
                            {sourceType === 'standard' ? 'Step 2: Upload CSV' : 'Upload XML File'}
                        </h3>
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-green-200 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files[0]) {
                                    setFile(e.dataTransfer.files[0]);
                                    setResult(null);
                                }
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept={acceptedExtensions}
                                onChange={handleFileChange}
                            />

                            {file ? (
                                <div>
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FileText className="w-6 h-6 text-green-600" />
                                    </div>
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    <button
                                        onClick={() => { setFile(null); setResult(null); }}
                                        className="mt-3 text-xs font-medium text-red-600 hover:text-red-700"
                                    >
                                        Remove File
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Upload className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="font-medium text-gray-900">Click to upload or drag & drop</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {sourceType === 'standard' ? 'CSV files only' : 'XML files preferred'}
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        Select File
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className={`p-4 rounded-lg border ${result.success > 0 && result.errors.length === 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.success > 0 && result.errors.length === 0 ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                )}
                                <h4 className="font-medium text-gray-900">Import Results</h4>
                            </div>

                            <div className="text-sm space-y-1">
                                {result.success > 0 && (
                                    <p className="text-green-700">✓ Successfully imported {result.success} transactions.</p>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-red-700 font-medium mb-1">{result.errors.length} errors found:</p>
                                        <ul className="list-disc pl-5 text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                                            {result.errors.map((err, idx) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Importing...' : 'Import Transactions'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportTransactionsModal;
