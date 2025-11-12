/**
 * @file CreateFundingRoundModal.tsx
 * @description A modal component with a form for creating a new funding round.
 * It includes fields for all the essential details required to start a new round.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FundingRound } from '@/types/dashboard-types';

type Status = 'Planned' | 'In Progress' | 'Closed';

/**
 * Props for the CreateFundingRoundModal component.
 * @interface CreateFundingRoundModalProps
 */
interface CreateFundingRoundModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new round data.
     * @param {Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'round_investors'>} roundData - The new round data for the backend.
     */
    onCreate: (roundData: Omit<FundingRound, 'round_id' | 'startup_id' | 'created_at' | 'amount_raised' | 'valuation_post' | 'round_investors'>) => void;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const CreateFundingRoundModal: React.FC<CreateFundingRoundModalProps> = ({ onClose, onCreate }) => {
    // Form state
    const [roundType, setRoundType] = useState('Seed');
    const [status, setStatus] = useState<Status>('Planned');
    const [targetAmount, setTargetAmount] = useState('');
    const [valuationPre, setValuationPre] = useState('');
    const [dateOpened, setDateOpened] = useState(new Date().toISOString().split('T')[0]);
    const [leadInvestor, setLeadInvestor] = useState('');
    const [notes, setNotes] = useState('');

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roundType || !targetAmount || !valuationPre) return;

        onCreate({
            round_type: roundType,
            status,
            target_amount: parseFloat(targetAmount),
            valuation_pre: parseFloat(valuationPre),
            date_opened: dateOpened,
            lead_investor: leadInvestor || undefined,
            notes: notes || undefined,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Start New Funding Round</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Round Type" id="round-type">
                                <input type="text" id="round-type" value={roundType} onChange={e => setRoundType(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Pre-Seed, Seed, Series A" />
                            </FormField>
                            <FormField label="Status" id="round-status">
                                <select id="round-status" value={status} onChange={e => setStatus(e.target.value as Status)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    <option>Planned</option>
                                    <option>In Progress</option>
                                    <option>Closed</option>
                                </select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField label="Target Amount" id="round-target">
                                <input type="number" id="round-target" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 1000000" />
                            </FormField>
                             <FormField label="Pre-money Valuation" id="round-valuation">
                                {/* FIX: Corrected a typo in the onChange event handler. It should be e.target.value, not e.g.target.value. */}
                                <input type="number" id="round-valuation" value={valuationPre} onChange={e => setValuationPre(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 7000000" />
                            </FormField>
                        </div>
                         <FormField label="Date Opened" id="round-date-opened">
                            <input type="date" id="round-date-opened" value={dateOpened} onChange={e => setDateOpened(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                         <FormField label="Lead Investor (Optional)" id="round-lead-investor">
                            <input type="text" id="round-lead-investor" value={leadInvestor} onChange={e => setLeadInvestor(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                         <FormField label="Notes (Optional)" id="round-notes">
                            <textarea id="round-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Create Round</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFundingRoundModal;