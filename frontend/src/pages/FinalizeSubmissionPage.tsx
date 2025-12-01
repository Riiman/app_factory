import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const FinalizeSubmissionPage = () => {
    const { submissionData, handleLogout } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!submissionData?.id) return;
        setIsSubmitting(true);
        setError('');
        try {
            await api.submitSubmission(submissionData.id);
            // Force reload to update auth context and redirect
            window.location.reload();
        } catch (err: any) {
            console.error("Failed to submit:", err);
            setError(err.message || 'Failed to submit application.');
            setIsSubmitting(false);
        }
    };

    const [editingField, setEditingField] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState('');

    const handleEdit = (key: string, value: any) => {
        setEditingField(key);
        setTempValue(value ? String(value) : '');
    };

    const handleCancel = () => {
        setEditingField(null);
        setTempValue('');
    };

    const handleSaveField = async (key: string) => {
        if (!submissionData?.id) return;
        try {
            await api.updateSubmission(submissionData.id, { [key]: tempValue });
            // Ideally refresh data here without full reload, but for now reload works or use refreshUser if available
            window.location.reload();
        } catch (err: any) {
            console.error("Failed to update field:", err);
            setError(err.message || 'Failed to update field.');
        }
    };

    if (!submissionData) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Finalize Your Submission
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Please review your details before submitting.
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                        Logout
                    </button>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        {Object.entries(submissionData).map(([key, value]) => {
                            if (['id', 'user_id', 'status', 'submitted_at', 'raw_chat_data', 'chat_progress_step', 'user', 'evaluation', 'startup'].includes(key)) {
                                return null;
                            }
                            const isEditing = editingField === key;
                            return (
                                <div key={key} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500 capitalize flex items-center">
                                        {key.replace(/_/g, ' ')}
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    rows={4}
                                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleSaveField(key)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-start group">
                                                <span className="whitespace-pre-wrap flex-grow">{value ? String(value) : <span className="text-gray-400">Not provided</span>}</span>
                                                <button
                                                    onClick={() => handleEdit(key, value)}
                                                    className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>
                <div className="px-4 py-5 sm:px-6 border-t border-gray-200 flex flex-col items-center">
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                        Once submitted, your application will be reviewed by our team.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinalizeSubmissionPage;
