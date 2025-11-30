/**
 * @file EditFundraisingGoalsModal.tsx
 * @description A modal component for editing a startup's fundraising details and next funding goals.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Fundraise, NextFundingGoal } from '@/types/dashboard-types';

/**
 * Props for the EditFundraisingGoalsModal component.
 * @interface EditFundraisingGoalsModalProps
 */
interface EditFundraisingGoalsModalProps {
    /** The current fundraise details to pre-fill the form. */
    fundraiseDetails: Fundraise;
    /** The current next funding goal details to pre-fill the form. */
    nextFundingGoal?: NextFundingGoal;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated data.
     * @param {Partial<Fundraise>} updatedFundraiseData - The updated fundraise data.
     * @param {Partial<NextFundingGoal>} updatedNextFundingGoalData - The updated next funding goal data.
     */
    onUpdate: (updatedFundraiseData: Partial<Fundraise>, updatedNextFundingGoalData: Partial<NextFundingGoal>) => void;
}

const EditFundraisingGoalsModal: React.FC<EditFundraisingGoalsModalProps> = ({ fundraiseDetails, nextFundingGoal, onClose, onUpdate }) => {
    // Fundraise state
    const [fundingStage, setFundingStage] = useState('');
    const [amountRaised, setAmountRaised] = useState<number | ''>('');

    // Next Funding Goal state
    const [targetAmount, setTargetAmount] = useState<number | ''>('');
    const [targetValuation, setTargetValuation] = useState<number | ''>('');
    const [targetCloseDate, setTargetCloseDate] = useState('');

    /** Effect to pre-fill the form when the modal is opened. */
    useEffect(() => {
        if (fundraiseDetails) {
            setFundingStage(fundraiseDetails.funding_stage || '');
            setAmountRaised(fundraiseDetails.amount_raised || '');
        }
        if (nextFundingGoal) {
            setTargetAmount(nextFundingGoal.target_amount || '');
            setTargetValuation(nextFundingGoal.target_valuation || '');
            setTargetCloseDate(nextFundingGoal.target_close_date || '');
        }
    }, [fundraiseDetails, nextFundingGoal]);

    /**
     * Handles the form submission.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        onUpdate(
            {
                funding_stage: fundingStage,
                amount_raised: amountRaised === '' ? undefined : Number(amountRaised),
            },
            {
                target_amount: targetAmount === '' ? undefined : Number(targetAmount),
                target_valuation: targetValuation === '' ? undefined : Number(targetValuation),
                target_close_date: targetCloseDate || undefined,
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Fundraising Goals</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800">Current Fundraise Details</h3>
                        <div>
                            <label htmlFor="funding-stage" className="block text-sm font-medium text-gray-700">Funding Stage</label>
                            <input type="text" id="funding-stage" value={fundingStage} onChange={e => setFundingStage(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="amount-raised" className="block text-sm font-medium text-gray-700">Amount Raised</label>
                            <input type="number" id="amount-raised" value={amountRaised} onChange={e => setAmountRaised(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-800 mt-6">Next Funding Goal</h3>
                        <div>
                            <label htmlFor="target-amount" className="block text-sm font-medium text-gray-700">Target Amount</label>
                            <input type="number" id="target-amount" value={targetAmount} onChange={e => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="target-valuation" className="block text-sm font-medium text-gray-700">Target Valuation</label>
                            <input type="number" id="target-valuation" value={targetValuation} onChange={e => setTargetValuation(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="target-close-date" className="block text-sm font-medium text-gray-700">Target Close Date</label>
                            <input type="date" id="target-close-date" value={targetCloseDate} onChange={e => setTargetCloseDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
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

export default EditFundraisingGoalsModal;
