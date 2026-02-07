import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Check } from 'lucide-react';
import api from '@/utils/api';
import { Feature } from '@/types/dashboard-types';

interface CreateSprintModalProps {
    productId: number;
    onClose: () => void;
    onCreate: (data: any) => void;
}

const CreateSprintModal: React.FC<CreateSprintModalProps> = ({ productId, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch backlog features
    const { data: features = [] } = useQuery({
        queryKey: ['planner_features', productId],
        queryFn: () => api.getFeatures(productId),
        enabled: !!productId
    });

    const backlogFeatures = features.filter((f: Feature) => !f.sprint_id && f.status !== 'DONE' && f.status !== 'SHIPPED');

    const toggleFeature = (id: number) => {
        if (selectedFeatureIds.includes(id)) {
            setSelectedFeatureIds(selectedFeatureIds.filter(fid => fid !== id));
        } else {
            setSelectedFeatureIds([...selectedFeatureIds, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !startDate || !endDate) {
            alert("Name, Start Date and End Date are required");
            return;
        }

        setIsLoading(true);
        try {
            await onCreate({
                name,
                goal,
                start_date: startDate,
                end_date: endDate,
                status: 'PLANNING',
                feature_ids: selectedFeatureIds
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">Create Sprint</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="e.g. Sprint 14"
                                    required
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
                                <textarea
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    placeholder="What do we want to achieve?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    required
                                />
                            </div>
                        </div>

                        {/* Feature Selection */}
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Add Features from Backlog</label>
                                <span className="text-xs text-gray-500">{selectedFeatureIds.length} selected</span>
                            </div>

                            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                                {backlogFeatures.length > 0 ? backlogFeatures.map((f: Feature) => (
                                    <div
                                        key={f.id}
                                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${selectedFeatureIds.includes(f.id) ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleFeature(f.id)}
                                    >
                                        <div className="flex-1 min-w-0 pr-3">
                                            <div className="font-medium text-sm text-gray-900 truncate">{f.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${f.priority <= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>P{f.priority}</span>
                                                {f.rice_score && <span className="text-[10px] text-purple-600">RICE: {f.rice_score}</span>}
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedFeatureIds.includes(f.id)
                                                ? 'bg-brand-primary border-brand-primary text-white'
                                                : 'border-gray-300 text-transparent'
                                            }`}>
                                            <Check size={12} />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-sm text-gray-400 italic">
                                        No backlog features available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-secondary disabled:opacity-50"
                        >
                            {isLoading ? 'Creating...' : 'Create Sprint'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSprintModal;
