/**
 * @file MonthlyReportDetailModal.tsx
 * @description A modal component that displays a detailed breakdown of a single
 * monthly business report, including financials, customer metrics, and qualitative summaries.
 */

import React from 'react';
import { BusinessMonthlyData } from '@/types/dashboard-types';
import Card from './Card';
import { X, TrendingUp, TrendingDown, Users, DollarSign, Banknote, Star, ShieldAlert, Zap } from 'lucide-react';

/**
 * Props for the MonthlyReportDetailModal component.
 * @interface MonthlyReportDetailModalProps
 */
interface MonthlyReportDetailModalProps {
    /** The specific monthly report data object to display. The backend should provide an object conforming to the `BusinessMonthlyData` interface. */
    report: BusinessMonthlyData;
    /** Callback function to close the modal. */
    onClose: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const MetricItem: React.FC<{ icon: React.ElementType, label: string, value: string | number, colorClass?: string }> = ({ icon: Icon, label, value, colorClass = 'text-gray-900' }) => (
    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
        <Icon className="h-6 w-6 text-brand-primary mr-4 mt-1 flex-shrink-0" />
        <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
        </div>
    </div>
);


const MonthlyReportDetailModal: React.FC<MonthlyReportDetailModalProps> = ({ report, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        Monthly Report: {new Date(report.month_start).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Financials</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MetricItem icon={DollarSign} label="Total Revenue" value={formatCurrency(report.total_revenue)} />
                            <MetricItem icon={TrendingUp} label="MRR" value={formatCurrency(report.mrr)} />
                            <MetricItem icon={TrendingDown} label="Total Expenses" value={formatCurrency(report.total_expenses)} colorClass="text-red-600" />
                            <MetricItem icon={TrendingDown} label="Net Burn" value={formatCurrency(report.net_burn)} colorClass="text-red-600" />
                            <MetricItem icon={Banknote} label="Cash in Bank" value={formatCurrency(report.cash_in_bank)} />
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Customers</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricItem icon={Users} label="Total Customers" value={report.total_customers} />
                            <MetricItem icon={Users} label="New Customers" value={report.new_customers} />
                            <MetricItem icon={TrendingDown} label="Churn Rate" value={`${report.churn_rate}%`} colorClass="text-yellow-600" />
                        </div>
                    </section>
                    
                    <section>
                         <h3 className="text-lg font-semibold text-gray-800 mb-4">Qualitative Summary</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card title="Key Highlights" className="border-green-300">
                                <div className="flex items-start">
                                    <Star className="h-5 w-5 text-green-500 mr-3 mt-0.5"/>
                                    <p className="text-sm text-gray-700">{report.key_highlights}</p>
                                </div>
                            </Card>
                            <Card title="Key Challenges" className="border-red-300">
                               <div className="flex items-start">
                                    <ShieldAlert className="h-5 w-5 text-red-500 mr-3 mt-0.5"/>
                                    <p className="text-sm text-gray-700">{report.key_challenges}</p>
                                </div>
                            </Card>
                            <Card title="Next Month's Focus" className="border-blue-300">
                                <div className="flex items-start">
                                    <Zap className="h-5 w-5 text-blue-500 mr-3 mt-0.5"/>
                                    <p className="text-sm text-gray-700">{report.next_focus}</p>
                                </div>
                            </Card>
                         </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default MonthlyReportDetailModal;