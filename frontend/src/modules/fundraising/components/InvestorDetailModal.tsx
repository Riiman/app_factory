import React, { useState } from 'react';
import { Investor, InvestorStage, ActivityLog } from '@/types/dashboard-types';
import { X, Calendar, DollarSign, Briefcase, MessageSquare, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface InvestorDetailModalProps {
    investor: Investor;
    startupId: number;
    onClose: () => void;
    onStageUpdate?: (newStage: InvestorStage) => void;
}

const InvestorDetailModal: React.FC<InvestorDetailModalProps> = ({ investor, startupId, onClose, onStageUpdate }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
    const [noteSummary, setNoteSummary] = useState('');
    const [noteType, setNoteType] = useState('Note');

    const { data: interactions, isLoading: interactionsLoading } = useQuery({
        queryKey: ['interactions', startupId, investor.investor_id],
        queryFn: () => api.getInvestorInteractions(startupId, investor.investor_id),
        enabled: activeTab === 'activity'
    });

    const logInteractionMutation = useMutation({
        mutationFn: async () => {
            return api.logInteraction(startupId, investor.investor_id, {
                type: noteType,
                summary: noteSummary
            });
        },
        onSuccess: () => {
            setNoteSummary('');
            queryClient.invalidateQueries({ queryKey: ['interactions', startupId, investor.investor_id] });
        }
    });

    // Separated stage update logic to parent to enforce rules

    const handleLogInteraction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteSummary.trim()) return;
        await logInteractionMutation.mutateAsync();
    };


    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{investor.name}</h3>
                                <p className="text-sm text-gray-500">{investor.firm_name} • {investor.type}</p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="mt-6 border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`${activeTab === 'overview' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`${activeTab === 'activity' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    Activity & Notes
                                </button>
                            </nav>
                        </div>

                        <div className="mt-6">
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Stage</label>
                                        <select
                                            value={investor.stage || InvestorStage.PROSPECT}
                                            onChange={(e) => onStageUpdate && onStageUpdate(e.target.value as InvestorStage)}
                                            disabled={!onStageUpdate || investor.stage === InvestorStage.PORTFOLIO}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            {Object.values(InvestorStage).map((s) => (
                                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                                <DollarSign className="w-4 h-4 mr-1" /> Check Size Interest
                                            </h4>
                                            <p className="text-gray-900">{investor.check_size_interest ? formatCurrency(investor.check_size_interest) : 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                                <DollarSign className="w-4 h-4 mr-1" /> Total Invested
                                            </h4>
                                            <p className="text-gray-900 font-bold text-green-600">
                                                {investor.total_invested && investor.total_invested > 0 ? formatCurrency(investor.total_invested) : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                                <Calendar className="w-4 h-4 mr-1" /> Next Action
                                            </h4>
                                            <p className="text-gray-900">
                                                {investor.next_action_date ? formatDate(investor.next_action_date) : 'None'}
                                                {investor.next_action_type && <span className="text-gray-500 text-xs ml-1">({investor.next_action_type})</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
                                        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                                            {investor.notes || 'No notes added.'}
                                        </div>
                                    </div>

                                    {(investor.email || investor.website) && (
                                        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                                            {investor.email && (
                                                <div>
                                                    <span className="text-gray-500 block">Email</span>
                                                    <a href={`mailto:${investor.email}`} className="text-brand-primary hover:underline">{investor.email}</a>
                                                </div>
                                            )}
                                            {investor.website && (
                                                <div>
                                                    <span className="text-gray-500 block">Website</span>
                                                    <a href={investor.website} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline truncate block">{investor.website}</a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-6">
                                    <form onSubmit={handleLogInteraction} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Log Interaction</h4>
                                        <div className="flex gap-2 mb-2">
                                            {['Note', 'Email', 'Call', 'Meeting'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setNoteType(type)}
                                                    className={`px-3 py-1 text-xs rounded-full border ${noteType === type ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-300'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={noteSummary}
                                            onChange={(e) => setNoteSummary(e.target.value)}
                                            placeholder="What happened? (e.g. Sent pitch deck, Good call, etc.)"
                                            className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                            rows={2}
                                        />
                                        <div className="mt-2 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={!noteSummary.trim() || logInteractionMutation.isPending}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                                            >
                                                {logInteractionMutation.isPending ? 'Saving...' : 'Save Log'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="space-y-4">
                                        {interactionsLoading ? (
                                            <p className="text-gray-500 text-center py-4">Loading history...</p>
                                        ) : interactions?.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">No interactions logged yet.</p>
                                        ) : (
                                            <div className="flow-root">
                                                <ul className="-mb-8">
                                                    {interactions?.map((item: any, itemIdx: number) => (
                                                        <li key={item.id}>
                                                            <div className="relative pb-8">
                                                                {itemIdx !== interactions.length - 1 ? (
                                                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                                                                ) : null}
                                                                <div className="relative flex space-x-3">
                                                                    <div>
                                                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${item.type === 'Meeting' ? 'bg-blue-500' :
                                                                            item.type === 'Call' ? 'bg-green-500' :
                                                                                item.type === 'Email' ? 'bg-gray-400' : 'bg-gray-300'
                                                                            }`}>
                                                                            <MessageSquare className="h-4 w-4 text-white" aria-hidden="true" />
                                                                        </span>
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                                        <div>
                                                                            <p className="text-sm text-gray-500">
                                                                                <span className="font-medium text-gray-900">{item.type}</span>: {item.summary}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                                            <time dateTime={item.date}>{formatDate(item.date)}</time>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
};

export default InvestorDetailModal;
