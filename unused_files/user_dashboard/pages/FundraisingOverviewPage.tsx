/**
 * @file FundraisingOverviewPage.tsx
 * @description This page serves as a high-level dashboard for the startup's fundraising efforts.
 * It displays the current funding stage, total amount raised, and the specific goals for the next round.
 */

import React from 'react';
import { FundraiseDetails } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Target, TrendingUp, Calendar, Edit } from 'lucide-react';

/**
 * Props for the FundraisingOverviewPage component.
 * @interface FundraisingOverviewPageProps
 */
interface FundraisingOverviewPageProps {
    /** The fundraising details object, including next goals. The backend should provide an object conforming to the `FundraiseDetails` interface. */
    fundraiseDetails: FundraiseDetails;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const FundraisingOverviewPage: React.FC<FundraisingOverviewPageProps> = ({ fundraiseDetails }) => {
    const { funding_stage, amount_raised, next_funding_goals } = fundraiseDetails;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Fundraising Overview</h1>
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Edit Goals</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Current Status">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Current Funding Stage</p>
                            <p className="text-2xl font-bold text-gray-900">{funding_stage}</p>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-gray-500">Total Amount Raised to Date</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount_raised)}</p>
                        </div>
                    </div>
                </Card>

                <Card title="Next Funding Goal">
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <Target className="h-6 w-6 text-brand-primary mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Target Amount</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(next_funding_goals.target_amount)}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <TrendingUp className="h-6 w-6 text-brand-primary mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Target Valuation</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(next_funding_goals.target_valuation)}</p>
                            </div>
                        </div>
                         <div className="flex items-center">
                            <Calendar className="h-6 w-6 text-brand-primary mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Target Close Date</p>
                                <p className="text-xl font-bold text-gray-900">{new Date(next_funding_goals.target_close_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FundraisingOverviewPage;