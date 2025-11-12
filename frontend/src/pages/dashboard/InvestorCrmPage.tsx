/**
 * @file InvestorCrmPage.tsx
 * @description This page acts as a simple Customer Relationship Management (CRM) tool
 * for managing investors. It displays all investor contacts in a sortable table.
 */

import React from 'react';
import { Investor } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus } from 'lucide-react';

/**
 * Props for the InvestorCrmPage component.
 * @interface InvestorCrmPageProps
 */
interface InvestorCrmPageProps {
    /** An array of all investor objects to be displayed. The backend should provide an array of `Investor` objects. */
    investors: Investor[];
    /** Callback function triggered when the "Add New Investor" button is clicked. */
    onAddNewInvestor: () => void;
}

const InvestorCrmPage: React.FC<InvestorCrmPageProps> = ({ investors, onAddNewInvestor }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Investor CRM</h1>
                <button 
                    onClick={onAddNewInvestor}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add New Investor</span>
                </button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(investors || []).map((investor) => (
                                <tr key={investor.investor_id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{investor.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{investor.firm_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {investor.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <a href={`mailto:${investor.email}`} className="text-brand-primary hover:underline">
                                            {investor.email}
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default InvestorCrmPage;