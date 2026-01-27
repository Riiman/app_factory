/**
 * @file InvestorCrmPage.tsx
 * @description This page acts as a simple Customer Relationship Management (CRM) tool
 * for managing investors. It displays all investor contacts in a sortable table.
 */

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Investor, InvestorStage } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus, LayoutList, Kanban } from 'lucide-react';
import PipelineBoard from './crm/PipelineBoard';
import AddInvestmentModal from '../components/AddInvestmentModal';
import InvestorDetailModal from '../components/InvestorDetailModal';
import api from '@/utils/api';

interface InvestorCrmPageProps {
    startupId: number;
    /** Callback function triggered when the "Add New Investor" button is clicked. */
    onAddNewInvestor: () => void;
}

const InvestorCrmPage: React.FC<InvestorCrmPageProps> = ({ startupId, onAddNewInvestor }) => {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
    const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

    // Investment Modal State
    const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
    const [investorForInvestment, setInvestorForInvestment] = useState<number | null>(null);

    const { data: investors = [] } = useQuery({
        queryKey: ['investors', startupId],
        queryFn: () => api.getInvestors(startupId),
        enabled: !!startupId,
    });

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: number; stage: InvestorStage }) => {
            return api.updateInvestor(startupId, id, { stage });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investors', startupId] });
        }
    });

    const createInvestmentMutation = useMutation({
        mutationFn: async ({ roundId, data }: { roundId: number, data: any }) => {
            return api.createInvestment(startupId, roundId, data.investor_id, data.amount_invested, data.shares);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investors', startupId] });
            queryClient.invalidateQueries({ queryKey: ['funding-rounds', startupId] });
            setIsInvestmentModalOpen(false);
            setInvestorForInvestment(null);
        }
    });

    const handleUpdateStage = (investorId: number, newStage: InvestorStage) => {
        const investor = investors.find(i => i.investor_id === investorId);
        if (!investor) return;

        // Restriction: Cannot move OUT of Portfolio
        if (investor.stage === InvestorStage.PORTFOLIO && newStage !== InvestorStage.PORTFOLIO) {
            // Optional: Add a toast notification here
            console.warn("Cannot move an investor out of the Portfolio stage.");
            return;
        }

        if (newStage === InvestorStage.PORTFOLIO) {
            // Open Investment Modal instead of direct update
            setInvestorForInvestment(investorId);
            setIsInvestmentModalOpen(true);
        } else {
            updateStageMutation.mutate({ id: investorId, stage: newStage });
        }
    };

    const handleInvestmentAdd = (investorId: number, amount: number, shares?: number, roundId?: number) => {
        if (roundId) {
            createInvestmentMutation.mutate({
                roundId,
                data: {
                    investor_id: investorId,
                    amount_invested: amount,
                    shares: shares
                }
            });
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold text-gray-900">Investor CRM</h1>
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Kanban Board"
                        >
                            <Kanban className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            title="List View"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <button
                    onClick={onAddNewInvestor}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add New Investor</span>
                </button>
            </div>

            {viewMode === 'board' ? (
                <PipelineBoard
                    investors={investors}
                    onUpdateStage={handleUpdateStage}
                    onInvestorClick={setSelectedInvestor}
                />
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(investors || []).map((investor) => (
                                    <tr key={investor.investor_id} onClick={() => setSelectedInvestor(investor)} className="cursor-pointer hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{investor.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{investor.firm_name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {investor.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <a href={`mailto:${investor.email}`} className="text-brand-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                                {investor.email}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

            )
            }

            {
                selectedInvestor && (
                    <InvestorDetailModal
                        investor={selectedInvestor}
                        startupId={startupId}
                        onClose={() => setSelectedInvestor(null)}
                        onStageUpdate={(newStage) => handleUpdateStage(selectedInvestor.investor_id, newStage)}
                    />
                )
            }

            <AddInvestmentModal
                isOpen={isInvestmentModalOpen}
                onClose={() => {
                    setIsInvestmentModalOpen(false);
                    setInvestorForInvestment(null);
                }}
                onAdd={handleInvestmentAdd}
                startupId={startupId}
                initialInvestorId={investorForInvestment || undefined}
                showRoundSelection={true}
            />
        </div >
    );
};

export default InvestorCrmPage;