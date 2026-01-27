
/**
 * @file EditProductBusinessDetailsModal.tsx
 * @description A modal component with a form for editing the business details of a product, including Business Model typing and Accounting linkage.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProductBusinessDetails, BusinessModelType, Account, AccountType } from '@/types/dashboard-types';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Props for the EditProductBusinessDetailsModal component.
 * @interface EditProductBusinessDetailsModalProps
 */
interface EditProductBusinessDetailsModalProps {
    /** The current product business details data to pre-fill the form. */
    productBusinessDetails: ProductBusinessDetails;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated data.
     * @param {Partial<ProductBusinessDetails>} updatedData - The updated product business details data.
     */
    onUpdate: (updatedData: Partial<ProductBusinessDetails>) => void;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const EditProductBusinessDetailsModal: React.FC<EditProductBusinessDetailsModalProps> = ({ productBusinessDetails, onClose, onUpdate }) => {
    const { user } = useAuth();

    // Form state
    const [modelType, setModelType] = useState<BusinessModelType>('TRANSACTIONAL');
    const [revenueAccountId, setRevenueAccountId] = useState<number | undefined>(undefined);
    const [costAccountId, setCostAccountId] = useState<number | undefined>(undefined);

    // Legacy fields
    const [pricingModel, setPricingModel] = useState('');
    const [targetCustomer, setTargetCustomer] = useState('');
    const [revenueStreams, setRevenueStreams] = useState('');
    const [distributionChannels, setDistributionChannels] = useState('');
    const [costStructure, setCostStructure] = useState('');

    // Fetch Accounts for linkage
    const { data: accounts = [] } = useQuery<Account[]>({
        queryKey: ['accounts', user?.startup_id],
        queryFn: () => user?.startup_id ? api.get(`/startups/${user?.startup_id}/accounting/accounts`) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const incomeAccounts = accounts.filter(a => a.type === AccountType.INCOME || a.type === AccountType.ASSET); // Some setups map sales to Asset directly? Usually Income.
    const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSE || a.type === AccountType.LIABILITY);

    /** Effect to pre-fill the form when the modal is opened. */
    useEffect(() => {
        if (productBusinessDetails) {
            setModelType(productBusinessDetails.model_type || 'TRANSACTIONAL');
            setRevenueAccountId(productBusinessDetails.revenue_account_id);
            setCostAccountId(productBusinessDetails.cost_account_id);

            setPricingModel(productBusinessDetails.pricing_model || '');
            setTargetCustomer(productBusinessDetails.target_customer || '');
            setRevenueStreams(productBusinessDetails.revenue_streams || '');
            setDistributionChannels(productBusinessDetails.distribution_channels || '');
            setCostStructure(productBusinessDetails.cost_structure || '');
        }
    }, [productBusinessDetails]);

    /**
     * Handles the form submission.
     * Packages the form state into an object and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({
            model_type: modelType,
            revenue_account_id: revenueAccountId ? Number(revenueAccountId) : undefined,
            cost_account_id: costAccountId ? Number(costAccountId) : undefined,
            pricing_model: pricingModel,
            target_customer: targetCustomer,
            revenue_streams: revenueStreams,
            distribution_channels: distributionChannels,
            cost_structure: costStructure,
            // Future: model_config state
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Business Configuration</h2>
                        <p className="text-sm text-gray-500">Configure business model and financial mapping</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                        {/* Section 1: Business Model Strategy */}
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold text-gray-800 border-b pb-1">1. Business Model Strategy</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Business Model Type" id="model-type">
                                    <select
                                        id="model-type"
                                        value={modelType}
                                        onChange={(e) => setModelType(e.target.value as BusinessModelType)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-brand-primary focus:border-brand-primary"
                                    >
                                        <option value="TRANSACTIONAL">Transactional (e.g. Hardware Sales)</option>
                                        <option value="SUBSCRIPTION">Subscription (e.g. SaaS)</option>
                                        <option value="SERVICE">Service (e.g. Consulting)</option>
                                        <option value="MARKETPLACE">Marketplace (e.g. Airbnb)</option>
                                        <option value="ADVERTISING">Advertising</option>
                                        <option value="HYBRID">Hybrid</option>
                                    </select>
                                </FormField>
                                <FormField label="Pricing Strategy Description" id="pricing-model">
                                    <input type="text" id="pricing-model" value={pricingModel} onChange={e => setPricingModel(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g. Freemium, High-Touch B2B" />
                                </FormField>
                            </div>
                        </div>

                        {/* Section 2: Financial Mapping */}
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold text-gray-800 border-b pb-1">2. Financial Ledger Mapping</h3>
                            <p className="text-xs text-gray-500">Map this product to your Chart of Accounts for automated reporting.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Revenue Account (Income)" id="revenue-account">
                                    <select
                                        id="revenue-account"
                                        value={revenueAccountId || ''}
                                        onChange={(e) => setRevenueAccountId(e.target.value ? Number(e.target.value) : undefined)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                                    >
                                        <option value="">-- No Mapping --</option>
                                        {incomeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.subtype})</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Direct Cost Account (COGS)" id="cost-account">
                                    <select
                                        id="cost-account"
                                        value={costAccountId || ''}
                                        onChange={(e) => setCostAccountId(e.target.value ? Number(e.target.value) : undefined)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                                    >
                                        <option value="">-- No Mapping --</option>
                                        {expenseAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.subtype})</option>)}
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        {/* Section 3: Market Context (Legacy) */}
                        <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                            <h3 className="text-md font-semibold text-gray-800 border-b pb-1">3. Market Context</h3>
                            <FormField label="Target Customer" id="target-customer">
                                <textarea id="target-customer" value={targetCustomer} onChange={e => setTargetCustomer(e.target.value)} rows={2} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                            </FormField>
                            <FormField label="Distribution" id="distribution-channels">
                                <textarea id="distribution-channels" value={distributionChannels} onChange={e => setDistributionChannels(e.target.value)} rows={2} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                            </FormField>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Save Configuration</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProductBusinessDetailsModal;
