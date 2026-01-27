import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Plus, Trash2, PieChart as PieChartIcon, Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { CapTableEntry } from '@/types/dashboard-types';

interface CapTablePageProps {
    startupId: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CapTablePage: React.FC<CapTablePageProps> = ({ startupId }) => {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [newEntry, setNewEntry] = useState({
        stakeholder_name: '',
        stakeholder_type: 'Founder',
        shares: '',
        investment_amount: ''
    });

    const { data: capTable = [], isLoading } = useQuery({
        queryKey: ['capTable', startupId],
        queryFn: () => api.getCapTable(startupId)
    });

    const addMutation = useMutation({
        mutationFn: (data: any) => api.addCapTableEntry(startupId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capTable', startupId] });
            setIsAdding(false);
            setNewEntry({ stakeholder_name: '', stakeholder_type: 'Founder', shares: '', investment_amount: '' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteCapTableEntry(startupId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capTable', startupId] });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addMutation.mutate({
            ...newEntry,
            shares: parseInt(newEntry.shares),
            investment_amount: parseFloat(newEntry.investment_amount) || 0
        });
    };

    // Calculate Totals and Percentages
    const totalShares = capTable.reduce((sum: number, entry: CapTableEntry) => sum + entry.shares, 0);
    const dataWithPercentages = capTable.map((entry: CapTableEntry) => ({
        ...entry,
        ownership_percentage: totalShares > 0 ? (entry.shares / totalShares) * 100 : 0
    }));

    // Data for Chart
    const chartData = dataWithPercentages.map((entry: any) => ({
        name: entry.stakeholder_name,
        value: entry.shares
    }));

    if (isLoading) return <div>Loading Cap Table...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cap Table</h1>
                    <p className="text-gray-500 mt-1">Manage your equity structure and stakeholders.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Stakeholder
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div className="p-4">
                        <p className="text-sm font-medium text-gray-500">Total Shares Issued</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{totalShares.toLocaleString()}</p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm font-medium text-gray-500">Total Capital Raised</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                            {formatCurrency(capTable.reduce((sum: number, e: CapTableEntry) => sum + e.investment_amount, 0))}
                        </p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm font-medium text-gray-500">Shareholders</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{capTable.length}</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visuals */}
                <div className="lg:col-span-1">
                    <Card title="Ownership Structure">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => value.toLocaleString() + " shares"} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Table */}
                <div className="lg:col-span-2">
                    <Card title="Stakeholders">
                        {isAdding && (
                            <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                            value={newEntry.stakeholder_name}
                                            onChange={e => setNewEntry({ ...newEntry, stakeholder_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <select
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                            value={newEntry.stakeholder_type}
                                            onChange={e => setNewEntry({ ...newEntry, stakeholder_type: e.target.value })}
                                        >
                                            <option>Founder</option>
                                            <option>Investor</option>
                                            <option>Employee</option>
                                            <option>Option Pool</option>
                                            <option>Advisor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Shares</label>
                                        <input
                                            required
                                            type="number"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                            value={newEntry.shares}
                                            onChange={e => setNewEntry({ ...newEntry, shares: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Investment ($)</label>
                                        <input
                                            type="number"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                            value={newEntry.investment_amount}
                                            onChange={e => setNewEntry({ ...newEntry, investment_amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-3 py-2 bg-brand-primary text-white rounded-md text-sm hover:bg-brand-primary/90"
                                    >
                                        Save Entry
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stakeholder</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ownership</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invested</th>
                                        <th scope="col" className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {dataWithPercentages.map((entry: any) => (
                                        <tr key={entry.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.stakeholder_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.stakeholder_type === 'Founder' ? 'bg-purple-100 text-purple-800' :
                                                    entry.stakeholder_type === 'Investor' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {entry.stakeholder_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{entry.shares.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                                                {entry.ownership_percentage.toFixed(2)}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                {entry.investment_amount > 0 ? formatCurrency(entry.investment_amount) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => deleteMutation.mutate(entry.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {capTable.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                                No stakeholders found. Add one to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CapTablePage;
