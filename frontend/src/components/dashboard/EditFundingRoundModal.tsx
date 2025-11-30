/**
 * @file EditFundingRoundModal.tsx
 * @description A modal component with a form for editing an existing funding round's details.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FundingRound } from '@/types/dashboard-types';

type Status = 'Planned' | 'In Progress' | 'Closed';

/**
 * Props for the EditFundingRoundModal component.
 * @interface EditFundingRoundModalProps
 */
interface EditFundingRoundModalProps {
    /** The existing funding round data to pre-fill the form. */
    round: FundingRound;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated round data.
     * @param {Partial<FundingRound>} updatedRoundData - The updated round data for the backend.
     */
    onUpdate: (updatedRoundData: Partial<FundingRound>) => void;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const EditFundingRoundModal: React.FC<EditFundingRoundModalProps> = ({ round, onClose, onUpdate }) => {
    // Form state, initialized with existing round data
    const [roundType, setRoundType] = useState(round.round_type || '');
    const [status, setStatus] = useState<Status>(round.status || 'Planned');
    const [targetAmount, setTargetAmount] = useState<number | ''>(round.target_amount || '');
    const [amountRaised, setAmountRaised] = useState<number | ''>(round.amount_raised || '');
    const [valuationPre, setValuationPre] = useState<number | ''>(round.valuation_pre || '');
    const [valuationPost, setValuationPost] = useState<number | ''>(round.valuation_post || '');
    const [dateOpened, setDateOpened] = useState(round.date_opened || '');
    const [dateClosed, setDateClosed] = useState(round.date_closed || '');
    const [leadInvestor, setLeadInvestor] = useState(round.lead_investor || '');
    const [notes, setNotes] = useState(round.notes || '');
    const [pitchDeckUrl, setPitchDeckUrl] = useState(round.pitch_deck_url || '');

    /**
     * Handles form submission, packages the data, and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roundType || !targetAmount) return; // Basic validation

        onUpdate({
            round_type: roundType,
            status,
            target_amount: typeof targetAmount === 'number' ? targetAmount : parseFloat(targetAmount),
            amount_raised: typeof amountRaised === 'number' ? amountRaised : (amountRaised === '' ? undefined : parseFloat(amountRaised)),
            valuation_pre: typeof valuationPre === 'number' ? valuationPre : (valuationPre === '' ? undefined : parseFloat(valuationPre)),
            valuation_post: typeof valuationPost === 'number' ? valuationPost : (valuationPost === '' ? undefined : parseFloat(valuationPost)),
            date_opened: dateOpened || undefined,
            date_closed: dateClosed || undefined,
            lead_investor: leadInvestor || undefined,
            notes: notes || undefined,
            pitch_deck_url: pitchDeckUrl || undefined,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Funding Round</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Round Type" id="edit-round-type">
                                <input type="text" id="edit-round-type" value={roundType} onChange={e => setRoundType(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Pre-Seed, Seed, Series A" />
                            </FormField>
                            <FormField label="Status" id="edit-round-status">
                                <select id="edit-round-status" value={status} onChange={e => setStatus(e.target.value as Status)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    <option>Planned</option>
                                    <option>In Progress</option>
                                    <option>Closed</option>
                                </select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField label="Target Amount" id="edit-round-target">
                                <input type="number" id="edit-round-target" value={targetAmount} onChange={e => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 1000000" />
                            </FormField>
                             <FormField label="Amount Raised (Optional)" id="edit-round-amount-raised">
                                <input type="number" id="edit-round-amount-raised" value={amountRaised} onChange={e => setAmountRaised(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 500000" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Pre-money Valuation" id="edit-round-valuation-pre">
                                <input type="number" id="edit-round-valuation-pre" value={valuationPre} onChange={e => setValuationPre(e.target.value === '' ? '' : Number(e.target.value))} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 7000000" />
                            </FormField>
                            <FormField label="Post-money Valuation (Optional)" id="edit-round-valuation-post">
                                <input type="number" id="edit-round-valuation-post" value={valuationPost} onChange={e => setValuationPost(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 7500000" />
                            </FormField>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Date Opened (Optional)" id="edit-round-date-opened">
                                <input type="date" id="edit-round-date-opened" value={dateOpened} onChange={e => setDateOpened(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                            <FormField label="Date Closed (Optional)" id="edit-round-date-closed">
                                <input type="date" id="edit-round-date-closed" value={dateClosed} onChange={e => setDateClosed(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                         <FormField label="Lead Investor (Optional)" id="edit-round-lead-investor">
                            <input type="text" id="edit-round-lead-investor" value={leadInvestor} onChange={e => setLeadInvestor(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                         <FormField label="Pitch Deck URL (Optional)" id="edit-round-pitch-deck-url">
                            <input type="url" id="edit-round-pitch-deck-url" value={pitchDeckUrl} onChange={e => setPitchDeckUrl(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                         <FormField label="Notes (Optional)" id="edit-round-notes">
                            <textarea id="edit-round-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditFundingRoundModal;
