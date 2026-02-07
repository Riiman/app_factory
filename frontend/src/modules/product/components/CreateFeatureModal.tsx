/**
 * @file CreateFeatureModal.tsx
 * @description A modal component with a form for creating a new product feature.
 * The form includes fields for the feature's name, description, and acceptance criteria.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Feature, FeatureStatus } from '@/types/dashboard-types';

/**
 * Props for the CreateFeatureModal component.
 * @interface CreateFeatureModalProps
 */
interface CreateFeatureModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new feature data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Feature, 'id' | 'product_id'>} featureData - The new feature data.
     */
    onCreate: (featureData: Omit<Feature, 'id' | 'product_id'>) => void;
}

const CreateFeatureModal: React.FC<CreateFeatureModalProps> = ({ onClose, onCreate }) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [userStory, setUserStory] = useState('');
    const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
    const [priority, setPriority] = useState<number>(3);

    // RICE Scoring State
    const [rice, setRice] = useState({
        reach: 0,
        impact: 0,
        confidence: 0,
        effort: 0
    });

    const calculateRiceScore = () => {
        if (rice.effort <= 0) return 0;
        return ((rice.reach * rice.impact * (rice.confidence / 100)) / rice.effort).toFixed(2);
    };

    /**
     * Handles form submission.
     * It prevents the default form action, performs basic validation,
     * packages the state into a data object, and calls the `onCreate` prop.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for mandatory fields
        if (!name.trim()) {
            alert('Please enter a feature name.');
            return;
        }
        onCreate({
            name,
            description,
            user_story: userStory,
            acceptance_criteria: acceptanceCriteria,
            priority,
            status: FeatureStatus.BACKLOG, // Default to Backlog
            // @ts-ignore - Adding custom field handling in onCreate
            rice_details: rice
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">Add New Feature</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <div>
                                <label htmlFor="feature-name" className="block text-sm font-medium text-gray-700">Feature Name <span className="text-red-500">*</span></label>
                                <input type="text" id="feature-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="e.g. User Authentication" />
                            </div>

                            <div>
                                <label htmlFor="user-story" className="block text-sm font-medium text-gray-700">User Story</label>
                                <input type="text" id="user-story" value={userStory} onChange={e => setUserStory(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="As a [user], I want [goal], so that [reason]" />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label htmlFor="feature-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="feature-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label htmlFor="feature-acceptance-criteria" className="block text-sm font-medium text-gray-700">Acceptance Criteria</label>
                            <textarea id="feature-acceptance-criteria" value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="- Must handle invalid inputs\n- Must send email confirmation"></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 py-2 text-sm font-medium border rounded-md transition-colors ${priority === p ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        P{p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">RICE Prioritization Score</h3>
                            <div className="bg-gray-100 px-3 py-1 rounded-lg">
                                <span className="text-xs text-gray-500 uppercase font-semibold mr-2">Calculated Score</span>
                                <span className="text-xl font-bold text-brand-primary">{calculateRiceScore()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Estimate of how many people this feature will reach">REACH (People/Event)</label>
                                <input type="number" min="0" value={rice.reach} onChange={e => setRice({ ...rice, reach: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Massive (3), High (2), Medium (1), Low (0.5), Minimal (0.25)">IMPACT (Score 0.25-3)</label>
                                <select value={rice.impact} onChange={e => setRice({ ...rice, impact: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    <option value="3">3 - Massive</option>
                                    <option value="2">2 - High</option>
                                    <option value="1">1 - Medium</option>
                                    <option value="0.5">0.5 - Low</option>
                                    <option value="0.25">0.25 - Minimal</option>
                                    <option value="0">0 - None</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Confidence level (100% = High confidence)">CONFIDENCE (%)</label>
                                <input type="number" min="0" max="100" value={rice.confidence} onChange={e => setRice({ ...rice, confidence: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Person-months (or weeks) of effort">EFFORT (Person-Mo)</label>
                                <input type="number" min="0" step="0.5" value={rice.effort} onChange={e => setRice({ ...rice, effort: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                        </div>
                    </div>

                </form>

                <div className="border-t p-4 flex justify-end space-x-2 shrink-0 bg-gray-50 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Feature</button>
                </div>
            </div>
        </div>
    );
};

export default CreateFeatureModal;