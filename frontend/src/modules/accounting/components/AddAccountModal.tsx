import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';
import api from '@/utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AccountType } from '@/types/dashboard-types';

interface AddAccountModalProps {
    onClose: () => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>(AccountType.ASSET);
    const [subtype, setSubtype] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await api.post(`/startups/${user?.startup_id}/accounting/accounts`, {
                name,
                type,
                subtype,
                initial_balance: initialBalance ? parseFloat(initialBalance) : 0
            });

            queryClient.invalidateQueries({ queryKey: ['accounts', user?.startup_id] });
            queryClient.invalidateQueries({ queryKey: ['journal', user?.startup_id] }); // Refresh journal too if opening balance created
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create account');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Account</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g. Petty Cash, Chase Savings"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as AccountType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {Object.values(AccountType).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtype (Optional)</label>
                            <input
                                type="text"
                                value={subtype}
                                onChange={(e) => setSubtype(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g. Bank, Cash"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Opening Balance (Optional)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                                type="number"
                                step="0.01"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">If set, an opening balance journal entry will be created.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAccountModal;
