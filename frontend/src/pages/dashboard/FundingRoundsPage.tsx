/**
 * @file FundingRoundsPage.tsx
 * @description This page displays a list of all historical and current fundraising rounds.
 * Each round is shown in a clickable card that visualizes its progress towards its funding target.
 */

import React from 'react';
import { FundingRound } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus } from 'lucide-react';

/**
 * Props for the FundingRoundsPage component.
 * @interface FundingRoundsPageProps
 */
interface FundingRoundsPageProps {
    /** An array of all funding round objects. The backend should provide an array of `FundingRound` objects. */
    fundingRounds: FundingRound[];
    /** Callback function triggered when a round card is clicked, passing the round's ID. */
    onSelectRound: (roundId: number) => void;
    /** Callback function triggered when the "Start New Round" button is clicked. */
    onAddNewRound: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Closed': return 'bg-green-100 text-green-800';
        case 'In Progress': return 'bg-yellow-100 text-yellow-800';
        case 'Planned':
        default: return 'bg-gray-100 text-gray-800';
    }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: 'compact'
    }).format(value);
};

const FundingRoundsPage: React.FC<FundingRoundsPageProps> = ({ fundingRounds, onSelectRound, onAddNewRound }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Funding Rounds</h1>
                <button 
                    onClick={onAddNewRound}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Start New Round</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(fundingRounds || []).map(round => {
                    const progress = round.target_amount > 0 ? (round.amount_raised / round.target_amount) * 100 : 0;
                    return (
                        <div key={round.round_id} onClick={() => onSelectRound(round.round_id)} className="cursor-pointer">
                            <Card>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-lg text-gray-900">{round.round_type} Round</h3>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(round.status)}`}>
                                        {round.status}
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm font-medium text-gray-700">
                                        <span>{formatCurrency(round.amount_raised)}</span>
                                        <span>{formatCurrency(round.target_amount)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                        <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-right mt-1">{Math.round(progress)}% Raised</p>
                                </div>
                                <div className="mt-4 text-sm text-gray-500">
                                    <p>Opened: {new Date(round.date_opened).toLocaleDateString()}</p>
                                    {round.date_closed && <p>Closed: {new Date(round.date_closed).toLocaleDateString()}</p>}
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FundingRoundsPage;