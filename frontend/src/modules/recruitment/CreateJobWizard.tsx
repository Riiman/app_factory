
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { X, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface CreateJobWizardProps {
    isOpen: boolean;
    onClose: () => void;
    startupId: number;
}

const CreateJobWizard: React.FC<CreateJobWizardProps> = ({ isOpen, onClose, startupId }) => {
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        location: '',
        salary_min: '',
        salary_max: '',
        currency: 'USD',
        keywords: '',
        context: '',
        description: '', // HTML content
        requirements: [] as string[]
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createJob(startupId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs', startupId] });
            onClose();
        }
    });

    const generateDescription = async () => {
        if (!formData.title || !formData.keywords) return;
        setIsLoadingAI(true);
        try {
            const result = await api.generateJobDescription(
                formData.title,
                formData.keywords,
                formData.context
            );
            setFormData(prev => ({ ...prev, description: result.description }));
            setStep(3); // Move to review step
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleSubmit = () => {
        createMutation.mutate({
            ...formData,
            salary_min: Number(formData.salary_min),
            salary_max: Number(formData.salary_max),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Create New Job Posting</h2>
                        <div className="flex space-x-2 mt-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 w-8 rounded-full ${step >= i ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1">
                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Step 1: The Basics</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-4 py-3 border"
                                    placeholder="e.g. Senior Frontend Engineer"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-4 py-3 border"
                                        placeholder="e.g. Remote, San Francisco"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Min Salary</label>
                                        <input
                                            type="number"
                                            value={formData.salary_min}
                                            onChange={e => setFormData({ ...formData, salary_min: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-4 py-3 border"
                                            placeholder="80000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Max Salary</label>
                                        <input
                                            type="number"
                                            value={formData.salary_max}
                                            onChange={e => setFormData({ ...formData, salary_max: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-4 py-3 border"
                                            placeholder="120000"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Step 2: AI Details</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Required Skills & Keywords</label>
                                <p className="text-xs text-gray-500 mb-1">Separated by commas. AI uses this to match candidates.</p>
                                <textarea
                                    value={formData.keywords}
                                    onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-3 border"
                                    placeholder="React, TypeScript, Node.js, AWS, Venture Experience..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role Context / Notes</label>
                                <p className="text-xs text-gray-500 mb-1">Any specific vibes or requirements for the AI generator?</p>
                                <textarea
                                    value={formData.context}
                                    onChange={e => setFormData({ ...formData, context: e.target.value })}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-3 border"
                                    placeholder="We need someone who can wear multiple hats and loves high-paced environments."
                                />
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg flex items-start">
                                <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-medium text-purple-900">Magic Write</h4>
                                    <p className="text-sm text-purple-700 mt-1">
                                        We will generate a full job description based on these details in the next step.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Step 3: Review & Publish</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Job Description (AI Generated)</label>
                                <div
                                    className="mt-2 w-full h-64 overflow-y-auto p-4 border rounded-md bg-gray-50 prose prose-sm focus:outline-none"
                                    contentEditable
                                    dangerouslySetInnerHTML={{ __html: formData.description }}
                                    onBlur={(e) => setFormData({ ...formData, description: e.currentTarget.innerHTML })}
                                />
                                <p className="text-xs text-gray-400 mt-2 text-right">You can edit the text directly above.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-4 py-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    <div className="flex space-x-3">
                        {step < 3 ? (
                            step === 2 ? (
                                <button
                                    onClick={generateDescription}
                                    disabled={isLoadingAI || !formData.keywords}
                                    className={`flex items-center px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm ${isLoadingAI ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoadingAI ? (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2 animate-spin" /> Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" /> Magic Write Next
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={!formData.title}
                                    className="flex items-center px-6 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors shadow-sm"
                                >
                                    Next <ArrowRight className="h-4 w-4 ml-2" />
                                </button>
                            )
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending}
                                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                            >
                                {createMutation.isPending ? 'Publishing...' : 'Publish Job'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateJobWizard;
