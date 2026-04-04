/**
 * @file FundingRoundDetailPage.tsx
 * @description A detailed view for a single funding round.
 * It displays the round's core details, a list of participating investors,
 * and all linked tasks and artifacts.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FundingRound, Investor, Task, Artifact } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { ArrowLeft, Edit, Plus, Users, ClipboardList, Paperclip } from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Props for the FundingRoundDetailPage component.
 * @interface FundingRoundDetailPageProps
 */
interface FundingRoundDetailPageProps {
    /** The ID of the funding round to display. */
    roundId: number;
    /** Callback function to navigate back to the funding rounds list. */
    onBack: () => void;
    /** Callback function to open the "Edit Round" modal for this funding round. */
    onEditRound: (round: FundingRound) => void;
    /** Callback function to open the "Add Investor" modal, pre-linking to this funding round. */
    onAddInvestor: (roundId: number) => void;
    /** Callback function to open the "Create Task" modal, pre-linking to this funding round. */
    onAddTask: (roundId: number) => void;
    /** Callback function to open the "Create Artifact" modal, pre-linking to this funding round. */
    onAddArtifact: (roundId: number) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const DetailItem: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-md font-semibold text-gray-800">{value || 'N/A'}</p>
    </div>
);

const FundingRoundDetailPage: React.FC<FundingRoundDetailPageProps> = ({ roundId, onBack, onEditRound, onAddInvestor, onAddTask, onAddArtifact }) => {
    const { user } = useAuth();
    
    // Fetch Data
    const { data: fundingRounds = [] } = useQuery<FundingRound[]>({
        queryKey: ['fundingRounds', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getFundingRounds(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const round = fundingRounds.find((r) => r.round_id === roundId);

    const { data: investors = [] } = useQuery<Investor[]>({
        queryKey: ['investors', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getInvestors(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getTasks(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const { data: artifacts = [] } = useQuery({
        queryKey: ['artifacts', user?.startup_id],
        queryFn: () => user?.startup_id ? (api as any).getArtifacts(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const linkedTasks = tasks.filter((t: Task) => t.linked_to_type === 'FundingRound' && t.linked_to_id === roundId);
    const linkedArtifacts = artifacts.filter((a: Artifact) => a.linked_to_type === 'FundingRound' && a.linked_to_id === roundId);

    if (!round) {
        return <div className="p-4">Loading round or round not found...</div>;
    }

    const getInvestorName = (investorId: number) => {
        return investors.find(i => i.investor_id === investorId)?.name || 'Unknown Investor';
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                <ArrowLeft size={16} className="mr-2" />
                Back to Funding Rounds
            </button>

            <Card>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{round.round_type} Round</h1>
                        <p className="text-gray-600">Status: {round.status}</p>
                    </div>
                    <button onClick={() => onEditRound(round)} className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1" /> Edit Round</button>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailItem label="Amount Raised" value={formatCurrency(round.amount_raised)} />
                    <DetailItem label="Target Amount" value={formatCurrency(round.target_amount)} />
                    <DetailItem label="Pre-money Valuation" value={formatCurrency(round.valuation_pre)} />
                    <DetailItem label="Lead Investor" value={round.lead_investor} />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                    title="Investors in this Round"
                    actions={<button onClick={() => onAddInvestor(round.round_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Investment</button>}
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b">
                                <tr>
                                    <th className="text-left text-sm font-medium text-gray-500 py-2">Investor</th>
                                    <th className="text-right text-sm font-medium text-gray-500 py-2">Amount Invested</th>
                                </tr>
                            </thead>
                            <tbody>
                                {round.investors.map(ri => {
                                    if (!ri || !ri.investor) return null;
                                    return (
                                        <tr key={ri.investor.investor_id} className="border-b">
                                            <td className="py-3 text-sm text-gray-800">{getInvestorName(ri.investor.investor_id)}</td>
                                            <td className="py-3 text-sm text-gray-600 text-right">{formatCurrency(ri.amount_invested)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card
                        title="Linked Tasks"
                        actions={<button onClick={() => onAddTask(round.round_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Task</button>}
                    >
                        <ul className="space-y-2">
                            {linkedTasks.map((task: Task) => (
                                <li key={task.id} className="flex items-center text-sm text-gray-700">
                                    <ClipboardList size={14} className="mr-2 text-gray-400" /> {task.name}
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card
                        title="Linked Artifacts"
                        actions={<button onClick={() => onAddArtifact(round.round_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Artifact</button>}
                    >
                        <ul className="space-y-2">
                            {linkedArtifacts.map((artifact: Artifact) => (
                                <li key={artifact.id} className="flex items-center text-sm text-gray-700">
                                    <Paperclip size={14} className="mr-2 text-gray-400" /> {artifact.name}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FundingRoundDetailPage;