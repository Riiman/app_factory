import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { Account, AccountType } from '@/types/dashboard-types';
import { Plus, Edit2, Wallet, Banknote, Landmark, CreditCard, PiggyBank } from 'lucide-react';
import AddAccountModal from '../components/AddAccountModal';
import EditAccountModal from '../components/EditAccountModal';

const AccountsPage: React.FC = () => {
    const { user } = useAuth();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // Timeline filters
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
    const [selectedYear, setSelectedYear] = useState<number | ''>('');

    const queryString = React.useMemo(() => {
        const params = new URLSearchParams();
        if (selectedMonth) params.append('month', selectedMonth.toString());
        if (selectedYear) params.append('year', selectedYear.toString());
        return params.toString() ? `?${params.toString()}` : '';
    }, [selectedMonth, selectedYear]);

    const { data: accounts = [], isLoading } = useQuery<Account[]>({
        queryKey: ['accounts', user?.startup_id, selectedMonth, selectedYear],
        queryFn: () => api.get(`/startups/${user?.startup_id}/accounting/accounts${queryString}`),
        enabled: !!user?.startup_id
    });

    const getAccountIcon = (type: AccountType) => {
        switch (type) {
            case AccountType.ASSET: return <Banknote className="w-5 h-5 text-green-600" />;
            case AccountType.LIABILITY: return <CreditCard className="w-5 h-5 text-red-600" />;
            case AccountType.EQUITY: return <Landmark className="w-5 h-5 text-purple-600" />;
            case AccountType.INCOME: return <Wallet className="w-5 h-5 text-blue-600" />;
            case AccountType.EXPENSE: return <PiggyBank className="w-5 h-5 text-orange-600" />;
            default: return <Wallet className="w-5 h-5 text-gray-600" />;
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading chart of accounts...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
                    <p className="text-sm text-gray-500">Manage your company's accounts and ledgers.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Time</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Time</option>
                        {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Account
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(AccountType).map((type) => {
                    const filteredAccounts = accounts.filter(a => a.type === type);
                    if (filteredAccounts.length === 0) return null;

                    return (
                        <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{type}</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {filteredAccounts.map((account) => (
                                    <div key={account.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                    {getAccountIcon(account.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{account.name}</h3>
                                                    <p className="text-xs text-gray-500">{account.subtype || 'Primary'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setEditingAccount(account)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="mt-4 flex items-end justify-between">
                                            <div className="text-sm">
                                                <span className="text-gray-400">Balance</span>
                                                <p className="font-semibold text-gray-900">${account.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-mono">ID: #{account.id}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isAddModalOpen && (
                <AddAccountModal
                    onClose={() => setIsAddModalOpen(false)}
                />
            )}

            {editingAccount && (
                <EditAccountModal
                    account={editingAccount}
                    onClose={() => setEditingAccount(null)}
                />
            )}
        </div>
    );
};

export default AccountsPage;
