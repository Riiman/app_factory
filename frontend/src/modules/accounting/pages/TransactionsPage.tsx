import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ArrowDownLeft, ArrowUpRight, Upload, Plus, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { Account, AccountType, JournalEntry } from '@/types/dashboard-types';
import CreateTransactionModal from '../components/CreateTransactionModal';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import AddAccountModal from '../components/AddAccountModal';

const TransactionsPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

    const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
        queryKey: ['accounts', user?.startup_id],
        queryFn: () => api.get(`/startups/${user?.startup_id}/accounting/accounts`),
        enabled: !!user?.startup_id
    });

    const { data: journalEntries = [], isLoading: journalLoading } = useQuery<JournalEntry[]>({
        queryKey: ['journal', user?.startup_id],
        queryFn: () => api.get(`/startups/${user?.startup_id}/accounting/journal`),
        enabled: !!user?.startup_id
    });

    const handleOpenTransaction = (type: 'INCOME' | 'EXPENSE') => {
        setTransactionType(type);
        setIsTransactionModalOpen(true);
    };


    const { data: businessModels = [] } = useQuery<any[]>({
        queryKey: ['business-models', user?.startup_id],
        queryFn: async () => {
            const res = await api.get(`/startups/${user?.startup_id}/business-models`);
            return res.business_models;
        },
        enabled: !!user?.startup_id
    });

    // Helper to update line
    const handleUpdateModel = async (lineId: number, modelId: string) => {
        try {
            await api.request('PATCH', `/startups/${user?.startup_id}/accounting/journal-lines/${lineId}`, {
                business_model_id: modelId ? Number(modelId) : null
            });
            queryClient.invalidateQueries({ queryKey: ['journal'] });
        } catch (e) {
            console.error("Failed to update model allocation", e);
        }
    };

    if (accountsLoading || journalLoading) return <div className="p-8 text-center text-gray-500">Loading transactions...</div>;

    const filteredEntries = journalEntries.filter(entry => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();

        // Calculate amount for search logic
        const bankLine = entry.lines.find(l => {
            const acc = accounts.find(a => a.id === l.account_id);
            return acc?.type === AccountType.ASSET && (acc?.subtype === 'Bank' || acc?.name.toLowerCase().includes('cash') || acc?.subtype === 'Cash');
        });
        const amount = bankLine ? (bankLine.debit > 0 ? bankLine.debit : -bankLine.credit) : 0;

        return (
            entry.description?.toLowerCase().includes(q) ||
            entry.reference?.toLowerCase().includes(q) ||
            entry.id.toString().includes(q) ||
            amount.toString().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-sm text-gray-500">View and manage all your financial transactions.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleOpenTransaction('INCOME')}
                        className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <ArrowDownLeft className="w-4 h-4" />
                        Record Income
                    </button>
                    <button
                        onClick={() => handleOpenTransaction('EXPENSE')}
                        className="flex items-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Record Expense
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Import CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Payment Account</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Description</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Reference</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Business Model Allocation</th>
                                <th className="px-6 py-3 font-medium text-gray-500 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredEntries.map((entry) => {
                                // Try to determine main amount. Usually the Bank Line.
                                const bankLine = entry.lines.find(l => {
                                    const acc = accounts.find(a => a.id === l.account_id);
                                    return acc?.type === AccountType.ASSET && (acc?.subtype === 'Bank' || acc?.name.toLowerCase().includes('cash') || acc?.subtype === 'Cash');
                                });

                                // The OTHER lines are what we want to allocate (Income/Expense lines)
                                const allocationLine = entry.lines.find(l => l.id !== bankLine?.id);

                                const amount = bankLine ? (bankLine.debit > 0 ? bankLine.debit : -bankLine.credit) : 0;
                                const isPositive = amount > 0;

                                const bankAccount = bankLine ? accounts.find(a => a.id === bankLine.account_id) : null;

                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 text-gray-600">{new Date(entry.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {bankAccount ? (
                                                <span className="flex items-center gap-2">
                                                    {bankAccount.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">Journal</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">{entry.description}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                                {entry.reference || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {allocationLine ? (
                                                <select
                                                    value={allocationLine.business_model_id || ''}
                                                    onChange={(e) => handleUpdateModel(allocationLine.id, e.target.value)}
                                                    className="block w-full max-w-[180px] text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">- Unallocated -</option>
                                                    {businessModels.map(model => (
                                                        <option key={model.id} value={model.id}>{model.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
                                            {amount !== 0 ? (isPositive ? '+' : '') + `$${Math.abs(amount).toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {isTransactionModalOpen && (
                <CreateTransactionModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => setIsTransactionModalOpen(false)}
                    type={transactionType}
                    accounts={accounts}
                    businessModels={businessModels}
                />
            )}

            {isImportModalOpen && (
                <ImportTransactionsModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                />
            )}
        </div>
    );
};

export default TransactionsPage;
