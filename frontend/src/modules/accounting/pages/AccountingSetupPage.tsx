import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface BankAccountInput {
    id: number;
    name: string;
    balance: string;
}

const AccountingSetupPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [accounts, setAccounts] = useState<BankAccountInput[]>([
        { id: 1, name: 'Main Business Checking', balance: '0.00' }
    ]);
    const [submitting, setSubmitting] = useState(false);

    const handleAddAccount = () => {
        const newId = (accounts[accounts.length - 1]?.id || 0) + 1;
        setAccounts([...accounts, { id: newId, name: '', balance: '0.00' }]);
    };

    const handleRemoveAccount = (id: number) => {
        if (accounts.length === 1) {
            toast.error("You must have at least one bank account.");
            return;
        }
        setAccounts(accounts.filter(acc => acc.id !== id));
    };

    const handleChange = (id: number, field: keyof BankAccountInput, value: string) => {
        setAccounts(accounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.startup_id) return;

        // Validation
        if (accounts.some(acc => !acc.name.trim())) {
            toast.error("All accounts must have a name.");
            return;
        }

        setSubmitting(true);
        try {
            const initialAccounts = accounts.map(acc => ({
                name: acc.name,
                balance: parseFloat(acc.balance) || 0
            }));

            await api.post(`/startups/${user.startup_id}/accounting/setup`, { initial_accounts: initialAccounts });
            toast.success("Accounting initialized successfully!");
            queryClient.invalidateQueries({ queryKey: ['startupData'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        } catch (error: any) {
            console.error("Setup error:", error);
            toast.error(error.message || "Failed to initialize accounting.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Set Up Your Books</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        To get started with accounting, please list your current bank accounts and their balances.
                        This will set your opening balances accurately. You can add more accounts later, but setting the
                        opening balance is best done now.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            Bank Accounts & Cash
                        </h2>

                        <div className="space-y-4">
                            {accounts.map((account, index) => (
                                <div key={account.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Account Name
                                        </label>
                                        <input
                                            type="text"
                                            value={account.name}
                                            onChange={(e) => handleChange(account.id, 'name', e.target.value)}
                                            placeholder="e.g. Chase Checking"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="w-full sm:w-48">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Current Balance
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={account.balance}
                                                onChange={(e) => handleChange(account.id, 'balance', e.target.value)}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAccount(account.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors mb-[2px]"
                                        title="Remove account"
                                        disabled={accounts.length === 1}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddAccount}
                            className="mt-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Another Account
                        </button>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Setting up...' : 'Initialize Accounting'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountingSetupPage;
