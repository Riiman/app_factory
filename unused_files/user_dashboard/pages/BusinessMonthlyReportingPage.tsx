/**
 * @file BusinessMonthlyReportingPage.tsx
 * @description This page displays a historical log of all monthly business and financial reports.
 * The data is presented in a table where each row is clickable to open a detailed modal view
 * for that specific month.
 */

import React from 'react';
import { BusinessMonthlyData } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus } from 'lucide-react';

/**
 * Props for the BusinessMonthlyReportingPage component.
 * @interface BusinessMonthlyReportingPageProps
 */
interface BusinessMonthlyReportingPageProps {
    /** An array of all monthly data records. The backend should provide an array of `BusinessMonthlyData` objects. */
    monthlyData: BusinessMonthlyData[];
    /** Callback function triggered when a table row is clicked, passing the corresponding report data. */
    onRowClick: (report: BusinessMonthlyData) => void;
    /** Callback function triggered when the "Add New Monthly Report" button is clicked. */
    onAddNewReport: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const BusinessMonthlyReportingPage: React.FC<BusinessMonthlyReportingPageProps> = ({ monthlyData, onRowClick, onAddNewReport }) => {
    const sortedData = [...monthlyData].sort((a, b) => new Date(b.month_start).getTime() - new Date(a.month_start).getTime()); // Sort descending

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Monthly Reporting</h1>
                <button 
                    onClick={onAddNewReport}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add New Monthly Report</span>
                </button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRR</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Burn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Customers</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highlights</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedData.map((record) => (
                                <tr 
                                    key={record.record_id} 
                                    onClick={() => onRowClick(record)}
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-primary underline">
                                        {new Date(record.month_start).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(record.total_revenue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(record.mrr)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatCurrency(record.net_burn)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.total_customers}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" style={{maxWidth: '25ch'}}>{record.key_highlights}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default BusinessMonthlyReportingPage;