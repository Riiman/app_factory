/**
 * @file FundraisingOverviewPage.tsx
 * @description This page serves as a high-level dashboard for the startup's fundraising efforts.
 * It displays the current funding stage, total amount raised, and the specific goals for the next round.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { Fundraise, NextFundingGoal, Investor, FundingRound, CapTableEntry, InvestorStage } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Target, TrendingUp, Calendar, Edit, DollarSign, Users, PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import EditFundraisingGoalsModal from '@/modules/fundraising/components/EditFundraisingGoalsModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface FundraisingOverviewPageProps {
    startupId: number;
}

const FundraisingOverviewPage: React.FC<FundraisingOverviewPageProps> = ({ startupId }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // --- Data Fetching ---
    const { data: fundraiseDetails } = useQuery({
        queryKey: ['fundraiseDetails', startupId],
        queryFn: () => api.getFundraiseDetails(startupId),
        enabled: !!startupId,
    });

    const { data: fundingRounds = [] } = useQuery({
        queryKey: ['fundingRounds', startupId],
        queryFn: () => api.getFundingRounds(startupId),
        enabled: !!startupId,
    });

    const { data: investors = [] } = useQuery({
        queryKey: ['investors', startupId],
        queryFn: () => api.getInvestors(startupId),
        enabled: !!startupId,
    });

    const { data: capTable = [] } = useQuery({
        queryKey: ['capTable', startupId],
        queryFn: () => api.getCapTable(startupId),
        enabled: !!startupId,
    });

    const { fundraise_details, next_funding_goal } = fundraiseDetails || {};
    const { funding_stage, amount_raised } = fundraise_details || {};
    const { target_amount, target_valuation, target_close_date } = next_funding_goal || {};

    // --- Calculations ---

    // Pipeline Value (Sum of check_size_interest for active prospects)
    const pipelineValue = useMemo(() => {
        return (investors as Investor[])
            .filter(inv => inv.stage !== 'PASSED' && inv.stage !== 'PORTFOLIO' && inv.check_size_interest)
            .reduce((sum, inv) => sum + (inv.check_size_interest || 0), 0);
    }, [investors]);

    // Investor Funnel Data
    const funnelData = useMemo(() => {
        const counts: Record<string, number> = {};
        const stages = [
            'PROSPECT', 'CONTACTED', 'MEETING', 'DUE_DILIGENCE', 'TERM_SHEET', 'COMMITTED', 'PORTFOLIO'
        ];

        stages.forEach(s => counts[s] = 0);

        (investors as Investor[]).forEach(inv => {
            if (inv.stage && counts[inv.stage] !== undefined) {
                counts[inv.stage]++;
            }
        });

        return stages.map(stage => ({
            name: stage.replace('_', ' '),
            count: counts[stage]
        }));
    }, [investors]);

    // Cap Table Summary Data
    const capTableData = useMemo(() => {
        const groups: Record<string, number> = {};
        (capTable as CapTableEntry[]).forEach(entry => {
            groups[entry.stakeholder_type] = (groups[entry.stakeholder_type] || 0) + entry.shares;
        });

        return Object.keys(groups).map(type => ({
            name: type,
            value: groups[type]
        }));
    }, [capTable]);

    const CAP_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Active Round
    const activeRound = useMemo(() => {
        return (fundingRounds as FundingRound[]).find(r => r.status === 'In Progress');
    }, [fundingRounds]);


    // --- Actions ---
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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fundraising Report</h1>
                    <p className="text-gray-500">Real-time overview of your fundraising performance.</p>
                </div>
                <button onClick={() => setIsEditModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Edit Goals</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Funding Stage</p>
                            <p className="text-2xl font-bold text-gray-900">{funding_stage || 'Not set'}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-brand-primary opacity-20" />
                    </div>
                </Card>
                <Card>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Raised</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount_raised || 0)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-500 opacity-20" />
                    </div>
                </Card>
                <Card>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Round Target</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(target_amount || 0)}</p>
                        </div>
                        <Target className="h-8 w-8 text-blue-500 opacity-20" />
                    </div>
                </Card>
                <Card>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pipeline Value</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(pipelineValue)}</p>
                        </div>
                        <Users className="h-8 w-8 text-purple-500 opacity-20" />
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Investor Funnel */}
                <Card title="Investor Funnel">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Cap Table Summary */}
                <Card title="Cap Table Summary">
                    <div className="h-80 w-full flex flex-col items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={capTableData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {capTableData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CAP_COLORS[index % CAP_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-4 mt-[-20px] pb-4">
                            {capTableData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center text-xs">
                                    <div className="w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: CAP_COLORS[index % CAP_COLORS.length] }}></div>
                                    <span>{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Active Round Details */}
            {activeRound ? (
                <Card title="Active Funding Round">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Round Type</p>
                            <p className="text-lg font-bold text-gray-900">{activeRound.round_type}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Target / Raised</p>
                            <div className="flex items-baseline space-x-2">
                                <p className="text-lg font-bold text-gray-900">{formatCurrency(activeRound.amount_raised)}</p>
                                <span className="text-gray-400">/</span>
                                <p className="text-sm text-gray-600">{formatCurrency(activeRound.target_amount)}</p>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                <div
                                    className="bg-brand-primary h-2.5 rounded-full"
                                    style={{ width: `${Math.min(((activeRound.amount_raised / activeRound.target_amount) * 100), 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pre-Money Valuation</p>
                            <p className="text-lg font-bold text-gray-900">{activeRound.valuation_pre ? formatCurrency(activeRound.valuation_pre) : 'N/A'}</p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="p-8 text-center">
                        <p className="text-gray-500">No active funding round found.</p>
                        <p className="text-sm text-gray-400 mt-1">Start a new round in the 'Funding Rounds' tab to track progress here.</p>
                    </div>
                </Card>
            )}

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