import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Feature, FeatureStatus } from '@/types/dashboard-types';
import api from '@/utils/api';

interface EditFeatureModalProps {
    feature: Feature;
    onClose: () => void;
    onUpdate: (updatedData: Partial<Feature>) => void;
}

const EditFeatureModal: React.FC<EditFeatureModalProps> = ({ feature, onClose, onUpdate }) => {
    const [name, setName] = useState(feature.name);
    const [description, setDescription] = useState(feature.description || '');
    const [userStory, setUserStory] = useState(feature.user_story || '');
    const [acceptanceCriteria, setAcceptanceCriteria] = useState(feature.acceptance_criteria || '');
    const [status, setStatus] = useState<FeatureStatus>(feature.status || FeatureStatus.PENDING);
    const [priority, setPriority] = useState<number>(feature.priority || 3);
    const [sprintId, setSprintId] = useState<number | null>(feature.sprint_id || null);
    const [releaseId, setReleaseId] = useState<number | null>(feature.release_id || null);
    const [targetDate, setTargetDate] = useState<string>(feature.target_date || '');
    const [isLoading, setIsLoading] = useState(false);

    // RICE Scoring State
    const [rice, setRice] = useState({
        reach: feature.rice_reach || 0,
        impact: feature.rice_impact || 0,
        confidence: feature.rice_confidence || 0,
        effort: feature.rice_effort || 0
    });

    // Fetch sprints and releases for the product
    const { data: sprints = [] } = useQuery({
        queryKey: ['sprints', feature.product_id],
        queryFn: () => api.getSprints(feature.product_id),
        enabled: !!feature.product_id
    });

    const { data: releases = [] } = useQuery({
        queryKey: ['releases', feature.product_id],
        queryFn: () => api.getReleases(feature.product_id),
        enabled: !!feature.product_id
    });

    useEffect(() => {
        setName(feature.name);
        setDescription(feature.description || '');
        setUserStory(feature.user_story || '');
        setAcceptanceCriteria(feature.acceptance_criteria || '');
        setStatus(feature.status || FeatureStatus.PENDING);
        setPriority(feature.priority || 3);
        setSprintId(feature.sprint_id || null);
        setReleaseId(feature.release_id || null);
        setTargetDate(feature.target_date || '');
        setRice({
            reach: feature.rice_reach || 0,
            impact: feature.rice_impact || 0,
            confidence: feature.rice_confidence || 0,
            effort: feature.rice_effort || 0
        });
    }, [feature]);

    const calculateRiceScore = () => {
        if (rice.effort <= 0) return 0;
        return ((rice.reach * rice.impact * (rice.confidence / 100)) / rice.effort).toFixed(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Please enter a feature name.');
            return;
        }

        setIsLoading(true);
        try {
            await onUpdate({
                name,
                description,
                user_story: userStory,
                acceptance_criteria: acceptanceCriteria,
                status,
                priority,
                sprint_id: sprintId,
                release_id: releaseId,
                target_date: targetDate,
                // @ts-ignore
                rice_details: rice
            });
            onClose();
        } catch (error) {
            console.error("Failed to update feature:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Feature</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 p-2 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as FeatureStatus)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                >
                                    {Object.values(FeatureStatus).map((s) => (
                                        <option key={s} value={s}>
                                            {s.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                                <select
                                    value={sprintId || ''}
                                    onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                >
                                    <option value="">No Sprint</option>
                                    {sprints.map((s: any) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Release</label>
                                <select
                                    value={releaseId || ''}
                                    onChange={(e) => setReleaseId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                >
                                    <option value="">No Release</option>
                                    {releases.map((r: any) => (
                                        <option key={r.id} value={r.id}>
                                            {r.version} {r.name ? `- ${r.name}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="user-story" className="block text-sm font-medium text-gray-700">User Story</label>
                                <input type="text" id="user-story" value={userStory} onChange={e => setUserStory(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="As a [user], I want [goal], so that [reason]" />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Criteria</label>
                            <textarea
                                value={acceptanceCriteria}
                                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                                placeholder="- User can click button..."
                            />
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                            />
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
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Estimate of how many people this feature will reach">REACH</label>
                                <input type="number" min="0" value={rice.reach} onChange={e => setRice({ ...rice, reach: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Massive (3), High (2), Medium (1), Low (0.5), Minimal (0.25)">IMPACT</label>
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
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Confidence level (100% = High confidence)">CONFIDENCE</label>
                                <input type="number" min="0" max="100" value={rice.confidence} onChange={e => setRice({ ...rice, confidence: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1" title="Person-months (or weeks) of effort">EFFORT</label>
                                <input type="number" min="0" step="0.5" value={rice.effort} onChange={e => setRice({ ...rice, effort: Number(e.target.value) })} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditFeatureModal;
