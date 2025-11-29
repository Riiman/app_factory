import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const PendingReviewPage = () => {
    const { user, submissionData, isLoading } = useAuth();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [editingField, setEditingField] = useState(null);
    const [fieldValue, setFieldValue] = useState('');

    useEffect(() => {
        if (!isLoading && !user) {
            navigate('/login');
        } else if (submissionData) {
            setSubmission(submissionData);
        }
    }, [isLoading, user, submissionData, navigate]);

    if (isLoading || !submission) {
        return <div className="flex justify-center items-center h-screen">Loading Submission...</div>;
    }

    const handleEdit = (field, value) => {
        setEditingField(field);
        setFieldValue(value);
    };

    const handleCancel = () => {
        setEditingField(null);
        setFieldValue('');
    };

    const handleSave = async () => {
        if (!editingField) return;

        try {
            const updatedSubmission = await api.updateSubmission(submission.id, { [editingField]: fieldValue });
            setSubmission(updatedSubmission);
            setEditingField(null);
        } catch (error) {
            console.error("Failed to update submission:", error);
            alert("Failed to save. Please try again.");
        }
    };
    
    const renderField = (key, value) => {
        const isEditing = editingField === key;
        return (
            <div key={key} className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-semibold capitalize text-lg mb-2">{key.replace(/_/g, ' ')}</h3>
                {isEditing ? (
                    <div>
                        <textarea
                            className="w-full p-2 border rounded"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            rows={5}
                        />
                        <div className="mt-2">
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600">Save</button>
                            <button onClick={handleCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-start">
                        <p className="text-gray-700 whitespace-pre-wrap">{value || <span className="text-gray-400">Not yet provided</span>}</p>
                        <button onClick={() => handleEdit(key, value)} className="text-blue-500 hover:underline ml-4">Edit</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Review Your Submission</h1>
                <p className="text-gray-600 mb-8">Please review your submission details below. You can edit any field before finalizing.</p>
                
                {Object.entries(submission)
                    .filter(([key]) => !['id', 'user_id', 'status', 'submitted_at', 'raw_chat_data', 'chat_progress_step', 'user', 'evaluation', 'startup'].includes(key))
                    .map(([key, value]) => renderField(key, value))}

            </div>
        </div>
    );
};

export default PendingReviewPage;
