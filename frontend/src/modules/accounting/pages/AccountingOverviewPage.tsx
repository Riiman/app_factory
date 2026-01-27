/**
 * @file AccountingOverviewPage.tsx
 * @description Enhanced accounting dashboard with cash flow, P&L, and expense analytics
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatDate } from '@/utils/formatters';
import { MetricCard, WaterfallChart } from '@/components/charts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AccountingOverviewPageProps {
    startupId: number;
}

const AccountingOverviewPage: React.FC<AccountingOverviewPageProps> = ({ startupId }) => {
    // Fetch analytics data
    const { data: cashFlow = [] } = useQuery({
        queryKey: ['cashFlow', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/accounting/cash-flow`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: pnl } = useQuery({
        queryKey: ['pnl', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/accounting/pnl`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: expenseBreakdown = [] } = useQuery({
        queryKey: ['expenseBreakdown', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/accounting/expense-breakdown`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: burnRateTrend = [] } = useQuery({
        queryKey: ['burnRateTrend', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/accounting/burn-rate-trend`);
            return res.data;
        },
        enabled: !!startupId
    });

    const { data: balanceSheet } = useQuery({
        queryKey: ['balanceSheet', startupId],
        queryFn: async () => {
            const res = await api.get(`/startups/${startupId}/analytics/accounting/balance-sheet`);
            return res.data;
        },
        enabled: !!startupId
    });

    const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Financial Intelligence</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Net Profit"
                    value={pnl?.net_profit || 0}
                    format="currency"
                    subtitle={`${pnl?.net_margin || 0}% margin`}
                    icon={<DollarSign className="w-6 h-6" />}
                    iconBgColor={(pnl?.net_profit || 0) >= 0 ? "bg-green-50" : "bg-red-50"}
                    iconColor={(pnl?.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}
                />
                <MetricCard
                    title="Total Revenue"
                    value={pnl?.revenue || 0}
                    format="currency"
                    icon={<TrendingUp className="w-6 h-6" />}
                    iconBgColor="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Operating Expenses"
                    value={pnl?.operating_expenses || 0}
                    format="currency"
                    icon={<TrendingDown className="w-6 h-6" />}
                    iconBgColor="bg-amber-50"
                    iconColor="text-amber-600"
                />
                <MetricCard
                    title="Net Worth"
                    value={balanceSheet?.net_worth || 0}
                    format="currency"
                    icon={<BarChart2 className="w-6 h-6" />}
                    iconBgColor="bg-purple-50"
                    iconColor="text-purple-600"
                />
            </div>

            {/* Cash Flow Waterfall */}
            {cashFlow.length > 0 && (
                <Card title="Cash Flow">
                    <WaterfallChart
                        data={cashFlow}
                        height={350}
                        formatValue={(value) => formatCurrency(value)}
                    />
                </Card>
            )}

            {/* P&L Summary & Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* P&L Summary */}
                {pnl && (
                    <Card title="Profit & Loss Summary">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Revenue</span>
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(pnl.revenue)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Cost of Goods Sold</span>
                                <span className="text-lg font-bold text-red-600">-{formatCurrency(pnl.cogs)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-t-2 border-green-200">
                                <span className="text-sm font-medium text-gray-700">Gross Profit</span>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">{formatCurrency(pnl.gross_profit)}</div>
                                    <div className="text-xs text-gray-500">{pnl.gross_margin}% margin</div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Operating Expenses</span>
                                <span className="text-lg font-bold text-red-600">-{formatCurrency(pnl.operating_expenses)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-t-2 border-blue-200">
                                <span className="text-sm font-bold text-gray-900">Net Profit</span>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${pnl.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(pnl.net_profit)}
                                    </div>
                                    <div className="text-xs text-gray-500">{pnl.net_margin}% margin</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Expense Breakdown */}
                {expenseBreakdown.length > 0 && (
                    <Card title="Expense Breakdown">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.category}: ${entry.percentage.toFixed(1)}%`}
                                        outerRadius={80}
                                        dataKey="amount"
                                    >
                                        {expenseBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
            </div>

            {/* Burn Rate Trend & Balance Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Burn Rate Trend */}
                {burnRateTrend.length > 0 && (
                    <Card title="Burn Rate & Runway Trend">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={burnRateTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(date) => formatDate(date, { month: 'short' })}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value: number, name: string) => {
                                            if (name === 'Burn Rate' || name === 'Cash Balance') {
                                                return formatCurrency(value);
                                            }
                                            return `${value} months`;
                                        }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="burn_rate" name="Burn Rate" stroke="#ef4444" strokeWidth={2} />
                                    <Line yAxisId="left" type="monotone" dataKey="cash_balance" name="Cash Balance" stroke="#10b981" strokeWidth={2} />
                                    <Line yAxisId="right" type="monotone" dataKey="runway_months" name="Runway" stroke="#0ea5e9" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {/* Balance Sheet Summary */}
                {balanceSheet && (
                    <Card title="Balance Sheet Summary">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Total Assets</span>
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(balanceSheet.total_assets)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Total Liabilities</span>
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(balanceSheet.total_liabilities)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Total Equity</span>
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(balanceSheet.total_equity)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-t-2 border-purple-200">
                                <span className="text-sm font-bold text-gray-900">Net Worth</span>
                                <span className={`text-xl font-bold ${balanceSheet.net_worth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(balanceSheet.net_worth)}
                                </span>
                            </div>

                            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
                                <strong>Formula:</strong> Assets - Liabilities = Net Worth
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Expense Details Table */}
            {expenseBreakdown.length > 0 && (
                <Card title="Expense Details">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {expenseBreakdown.map((expense: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{expense.category}</td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-600">{formatCurrency(expense.amount)}</td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{expense.percentage}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AccountingOverviewPage;
