import React, { useState, useEffect } from 'react';
import { CrmContact, CrmCompany, CrmLifecycleStage, CrmLeadStatus } from '../types';
import { crmApi } from '../api';

interface ContactFormProps {
    initialData?: Partial<CrmContact>;
    onSubmit: () => void;
    onCancel: () => void;
    isLead?: boolean; // If true, sets default stage to LEAD and shows lead status
}

const ContactForm: React.FC<ContactFormProps> = ({ initialData, onSubmit, onCancel, isLead }) => {
    const [formData, setFormData] = useState<Partial<CrmContact>>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        company_id: undefined,
        lifecycle_stage: isLead ? CrmLifecycleStage.LEAD : CrmLifecycleStage.CUSTOMER,
        lead_status: CrmLeadStatus.NEW,
        ...initialData
    });

    const [companies, setCompanies] = useState<CrmCompany[]>([]);

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await crmApi.getCompanies();
                setCompanies(data);
            } catch (error) {
                console.error("Failed to fetch companies", error);
            }
        };
        fetchCompanies();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (initialData?.id) {
                await crmApi.updateContact(initialData.id, formData);
            } else {
                await crmApi.createContact(formData);
            }
            onSubmit();
        } catch (error) {
            console.error("Failed to save contact", error);
            alert("Failed to save contact");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <select
                    name="company_id"
                    value={formData.company_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value ? Number(e.target.value) : undefined }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                    <option value="">Select Company</option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Or create a new company (Not implemented in this form yet)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Lifecycle Stage</label>
                    <select
                        name="lifecycle_stage"
                        value={formData.lifecycle_stage}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                        {Object.values(CrmLifecycleStage).map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                        ))}
                    </select>
                </div>
                {(formData.lifecycle_stage === CrmLifecycleStage.LEAD || formData.lifecycle_stage === CrmLifecycleStage.MQL || formData.lifecycle_stage === CrmLifecycleStage.SQL) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lead Status</label>
                        <select
                            name="lead_status"
                            value={formData.lead_status}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            {Object.values(CrmLeadStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Save
                </button>
            </div>
        </form>
    );
};

export default ContactForm;
