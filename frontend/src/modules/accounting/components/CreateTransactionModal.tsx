
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { X, DollarSign, Calendar, FileText, Tag, Box, ArrowRight } from 'lucide-react';
import { Account, AccountType, BusinessModel } from '@/types/dashboard-types';

interface CreateTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'INCOME' | 'EXPENSE';
    accounts: Account[];
    businessModels?: BusinessModel[];
}

const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({ isOpen, onClose, type, accounts, businessModels = [] }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [submitting, setSubmitting] = useState(false);
    const [mode, setMode] = useState<'SIMPLE' | 'ITEMIZED'>('SIMPLE');

    // Form State
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');

    // Itemized State
    const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState<number>(0);

    // Filter accounts (Assets -> Bank or Cash)
    const paymentAccounts = accounts.filter(acc =>
        acc.type === AccountType.ASSET &&
        (acc.subtype === 'Bank' || acc.subtype === 'Cash' || acc.name.toLowerCase().includes('cash') || acc.name.toLowerCase().includes('bank'))
    );

    const categoryAccounts = accounts.filter(acc => type === 'INCOME' ? acc.type === AccountType.INCOME : acc.type === AccountType.EXPENSE);

    const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<number>(0);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);

    // Initialize dropdown selections when accounts load
    useEffect(() => {
        if (paymentAccounts.length > 0 && selectedPaymentAccountId === 0) {
            setSelectedPaymentAccountId(paymentAccounts[0].id);
        }
    }, [paymentAccounts, selectedPaymentAccountId]);

    useEffect(() => {
        if (categoryAccounts.length > 0 && selectedCategoryId === 0) {
            setSelectedCategoryId(categoryAccounts[0].id);
        }
    }, [categoryAccounts, selectedCategoryId]);

    // Auto-calculate amount when Itemized fields change
    useEffect(() => {
        if (mode === 'ITEMIZED') {
            const total = (Number(quantity) * Number(unitPrice)).toFixed(2);
            setAmount(total);
        }
    }, [quantity, unitPrice, mode]);

    // Handle Model Selection
    const handleModelChange = (modelId: string) => {
        if (!modelId) {
            setSelectedModelId(null);
            return;
        }

        const id = Number(modelId);
        setSelectedModelId(id);
        const model = businessModels.find(m => m.id === id);

        if (model) {
            // Auto-fill price
            if (model.target_arpu) {
                setUnitPrice(model.target_arpu);
            }

            // Auto-select Account
            const mappedAccountId = type === 'INCOME' ? model.revenue_account_id : model.cost_account_id;
            if (mappedAccountId) {
                // Verify account exists in our filtered list (safety check)
                const exists = categoryAccounts.find(a => a.id === mappedAccountId);
                if (exists) {
                    setSelectedCategoryId(mappedAccountId);
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.startup_id) return;

        setSubmitting(true);
        try {
            await api.post(`/startups/${user.startup_id}/accounting/transaction`, {
                type,
                date,
                amount: parseFloat(amount),
                account_id: selectedCategoryId,
                bank_account_id: selectedPaymentAccountId,
                description,
                reference,
                // Add Itemized Data
                quantity: mode === 'ITEMIZED' ? Number(quantity) : 0,
                business_model_id: mode === 'ITEMIZED' ? selectedModelId : null
            });

            toast.success("Transaction recorded successfully!");
            queryClient.invalidateQueries({ queryKey: ['journal'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            onClose();
        } catch (error: any) {
            console.error("Transaction error:", error);
            toast.error(error.message || "Failed to record transaction.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center ${type === 'INCOME' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <h2 className={`text-lg font-semibold ${type === 'INCOME' ? 'text-green-800' : 'text-red-800'}`}>
                        Record {type === 'INCOME' ? 'Income' : 'Expense'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Mode Switcher */}
                <div className="px-6 pt-4 flex gap-4 border-b border-gray-100 pb-0">
                    <button
                        onClick={() => setMode('SIMPLE')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${mode === 'SIMPLE' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Simple Amount
                    </button>
                    <button
                        onClick={() => setMode('ITEMIZED')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mode === 'ITEMIZED' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Box className="w-4 h-4" />
                        From Item / Model
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">

                    {/* Itemized Mode Fields */}
                    {mode === 'ITEMIZED' && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Item (Business Model)</label>
                                <select
                                    value={selectedModelId || ''}
                                    onChange={(e) => handleModelChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                >
                                    <option value="">-- Choose Sales Item --</option>
                                    {businessModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} {m.target_arpu ? `($${m.target_arpu})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={unitPrice}
                                            onChange={(e) => setUnitPrice(Number(e.target.value))}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Amount Display (Read Only in Itemized, Editable in Simple) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                readOnly={mode === 'ITEMIZED'} // Locked in itemized mode
                                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg ${mode === 'ITEMIZED' ? 'bg-gray-100' : ''}`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Account</label>
                            <select
                                value={selectedPaymentAccountId}
                                onChange={(e) => setSelectedPaymentAccountId(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            >
                                {paymentAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category / Account</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            >
                                {categoryAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        {mode === 'ITEMIZED' && selectedModelId && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center">
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Auto-selected based on business model
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description / Ref</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                required
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ref / Invoice #"
                            />
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Description"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 ${type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {submitting ? 'Saving...' : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTransactionModal;
