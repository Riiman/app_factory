
import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import { Investor } from '@/types/dashboard-types';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';

interface AddInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (investorId: number, amount: number) => void;
    startupId: number;
}

const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({ isOpen, onClose, onAdd, startupId }) => {
    const [selectedInvestorId, setSelectedInvestorId] = useState<number | ''>('');
    const [amount, setAmount] = useState<string>('');

    const { data: investors = [] } = useQuery<Investor[]>({
        queryKey: ['investors', startupId],
        queryFn: () => api.getInvestors(startupId),
        enabled: !!startupId && isOpen,
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedInvestorId('');
            setAmount('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedInvestorId && amount) {
            onAdd(Number(selectedInvestorId), Number(amount));
            onClose();
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Add Investment
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="investor" className="block text-sm font-medium text-gray-700">
                                            Investor
                                        </label>
                                        <select
                                            id="investor"
                                            required
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
                                            value={selectedInvestorId}
                                            onChange={(e) => setSelectedInvestorId(Number(e.target.value))}
                                        >
                                            <option value="" disabled>Select an investor</option>
                                            {investors.map((investor) => (
                                                <option key={investor.investor_id} value={investor.investor_id}>
                                                    {investor.name} {investor.firm_name ? `(${investor.firm_name})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                                            Amount Invested ($)
                                        </label>
                                        <input
                                            type="number"
                                            id="amount"
                                            required
                                            min="0"
                                            step="0.01"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>

                                    <div className="mt-4 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                                            disabled={!selectedInvestorId || !amount}
                                        >
                                            Add Investment
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AddInvestmentModal;
