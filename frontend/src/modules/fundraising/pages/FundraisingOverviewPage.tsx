/**
 * @file FundraisingOverviewPage.tsx
 * @description This page serves as a high-level dashboard for the startup's fundraising efforts.
 * It displays the current funding stage, total amount raised, and the specific goals for the next round.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { Fundraise, NextFundingGoal } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Target, TrendingUp, Calendar, Edit } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import EditFundraisingGoalsModal from '@/modules/fundraising/components/EditFundraisingGoalsModal';

interface FundraisingOverviewPageProps {
    startupId: number;
}

const FundraisingOverviewPage: React.FC<FundraisingOverviewPageProps> = ({ startupId }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: fundraiseDetails } = useQuery({
        queryKey: ['fundraiseDetails', startupId],
        queryFn: () => api.getFundraiseDetails(startupId),
        enabled: !!startupId,
    });

    const { funding_stage, amount_raised, next_funding_goal } = fundraiseDetails || {};
    const { target_amount, target_valuation, target_close_date } = next_funding_goal || {};

    const handleUpdateFundraisingGoals = async (updatedFundraiseData: Partial<Fundraise>, updatedNextFundingGoalData: Partial<NextFundingGoal>) => {
        try {
            await api.updateFundraisingGoals(startupId, updatedFundraiseData, updatedNextFundingGoalData);
            queryClient.invalidateQueries({ queryKey: ['fundraiseDetails', startupId] });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update fundraising goals:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Fundraising Overview</h1>
                <button onClick={() => setIsEditModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Edit Goals</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Current Status">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Current Funding Stage</p>
                            <p className="text-2xl font-bold text-gray-900">{funding_stage || 'Not specified'}</p>
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
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(target_amount)}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <TrendingUp className="h-6 w-6 text-brand-primary mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Target Valuation</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(target_valuation)}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="h-6 w-6 text-brand-primary mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Target Close Date</p>
                                <p className="text-xl font-bold text-gray-900">{formatDate(target_close_date)}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {isEditModalOpen && (
                <EditFundraisingGoalsModal
                    fundraiseDetails={fundraiseDetails || {} as Fundraise}
                    onClose={() => setIsEditModalOpen(false)}
                    onUpdate={handleUpdateFundraisingGoals}
                />
            )}
        </div>
    );
};

export default FundraisingOverviewPage;