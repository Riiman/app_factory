import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { CrmDeal, CrmDealStage, CrmContact, CrmCompany } from '../types';

interface CreateDealModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialContactId?: number;
    initialCompanyId?: number;
}

const CreateDealModal: React.FC<CreateDealModalProps> = ({ onClose, onSuccess, initialContactId, initialCompanyId }) => {
    const [formData, setFormData] = useState<Partial<CrmDeal>>({
        name: '',
        amount: 0,
        stage: CrmDealStage.APPOINTMENT_SCHEDULED,
        contact_id: initialContactId,
        company_id: initialCompanyId,
        close_date: ''
    });

    const [contacts, setContacts] = useState<CrmContact[]>([]);
    const [companies, setCompanies] = useState<CrmCompany[]>([]);

    useEffect(() => {
        const loadData = async () => {
            // Parallel fetch for simplicity
            try {
                const [contactsData, companiesData] = await Promise.all([
                    crmApi.getContacts(),
                    crmApi.getCompanies()
                ]);
                setContacts(contactsData);
                setCompanies(companiesData);
            } catch (e) {
                console.error("Failed to load contacts/companies", e);
            }
        };
        loadData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Ensure numbers are numbers
            const payload = {
                ...formData,
                amount: Number(formData.amount),
                contact_id: formData.contact_id ? Number(formData.contact_id) : undefined,
                company_id: formData.company_id ? Number(formData.company_id) : undefined
            };
            await crmApi.createDeal(payload);
            onSuccess();
        } catch (error) {
            console.error("Failed to create deal", error);
            alert("Failed to create deal");
        }
    };

    return (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                        <div className="absolute top-0 right-0 pt-4 pr-4">
                            <button
                                type="button"
                                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                onClick={onClose}
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">Create New Deal</h3>
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deal Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    placeholder="e.g. Acme Corp Annual Contract"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Close Date</label>
                                    <input
                                        type="date"
                                        name="close_date"
                                        value={formData.close_date ? String(formData.close_date) : ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Stage</label>
                                <select
                                    name="stage"
                                    value={formData.stage}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                >
                                    {Object.values(CrmDealStage).map(stage => (
                                        <option key={stage} value={stage}>{stage.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contact</label>
                                    <select
                                        name="contact_id"
                                        value={formData.contact_id || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        <option value="">Select Contact</option>
                                        {contacts.map(c => (
                                            <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.company_name || 'No Company'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Company</label>
                                    <select
                                        name="company_id"
                                        value={formData.company_id || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Create Deal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateDealModal;
