/**
 * @file BusinessOverviewPage.tsx
 * @description This page serves as a high-level dashboard for the startup's business health.
 * It displays key financial metrics over time in a chart, along with strategic information
 * like the business model and key partners.
 */

import React from 'react';
import { BusinessOverview, BusinessMonthlyData } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Edit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Props for the BusinessOverviewPage component.
 * @interface BusinessOverviewPageProps
 */
interface BusinessOverviewPageProps {
    /** The business overview object containing strategic information. The backend should provide an object conforming to the `BusinessOverview` interface. */
    businessOverview: BusinessOverview;
    /** An array of monthly financial data points to be displayed in the chart. The backend should provide an array of `BusinessMonthlyData` objects. */
    monthlyData: BusinessMonthlyData[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const BusinessOverviewPage: React.FC<BusinessOverviewPageProps> = ({ businessOverview, monthlyData = [] }) => {
    const sortedData = [...monthlyData].sort((a, b) => new Date(a.month_start).getTime() - new Date(b.month_start).getTime());
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Business Overview & Model</h1>
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Edit Overview</span>
                </button>
            </div>

            <Card title="Key Financial Metrics Over Time">
                <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month_start" tickFormatter={(date) => new Date(date).toLocaleString('default', { month: 'short', year: '2-digit' })} />
                            <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="total_revenue" name="Total Revenue" stroke="#4F46E5" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="mrr" name="MRR" stroke="#22c55e" />
                            <Line type="monotone" dataKey="net_burn" name="Net Burn" stroke="#ef4444" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Business Model">
                    <p className="text-gray-700">{businessOverview.business_model}</p>
                </Card>
                <Card title="Key Partners">
                    <p className="text-gray-700">{businessOverview.key_partners}</p>
                </Card>
            </div>

            <Card title="Notes">
                <p className="text-gray-700 whitespace-pre-wrap">{businessOverview.notes}</p>
            </Card>
        </div>
    );
};

export default BusinessOverviewPage;