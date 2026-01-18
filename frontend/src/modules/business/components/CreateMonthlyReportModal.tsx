/**
 * @file CreateMonthlyReportModal.tsx
 * @description A modal component with a form for creating a new monthly business report.
 * It includes fields for all key financial, customer, and qualitative metrics.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BusinessMonthlyData } from '@/types/dashboard-types';
import Papa from 'papaparse';

/**
 * Props for the CreateMonthlyReportModal component.
 * @interface CreateMonthlyReportModalProps
 */
interface CreateMonthlyReportModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new report data.
     * @param {Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>} reportData - The new report data for the backend.
     */
    onCreate: (reportData: Omit<BusinessMonthlyData, 'record_id' | 'startup_id' | 'created_by' | 'created_at'>) => void;
}

const FormRow = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const CreateMonthlyReportModal: React.FC<CreateMonthlyReportModalProps> = ({ onClose, onCreate }) => {

    // Helper to get the first day of the current month in YYYY-MM-DD format
    const getFirstDayOfCurrentMonth = () => {
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        return firstDay.toISOString().split('T')[0];
    };

    // Form state
    const [monthStart, setMonthStart] = useState(getFirstDayOfCurrentMonth());
    const [totalRevenue, setTotalRevenue] = useState('');
    const [totalExpenses, setTotalExpenses] = useState('');
    const [mrr, setMrr] = useState('');
    const [cashInBank, setCashInBank] = useState('');
    const [newCustomers, setNewCustomers] = useState('');
    const [totalCustomers, setTotalCustomers] = useState('');
    const [churnRate, setChurnRate] = useState('');
    const [keyHighlights, setKeyHighlights] = useState('');
    const [keyChallenges, setKeyChallenges] = useState('');
    const [nextFocus, setNextFocus] = useState('');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: (results: any) => {
                const data = results.data[0]; // Assuming one row for now or user picks the relevant one. Let's take the first non-empty row.
                if (data) {
                    // Flexible mapping based on template headers
                    if (data['Month']) setMonthStart(data['Month']); // Should be YYYY-MM-DD
                    if (data['Revenue']) setTotalRevenue(data['Revenue']);
                    if (data['Expenses']) setTotalExpenses(data['Expenses']);
                    if (data['MRR']) setMrr(data['MRR']);
                    if (data['Cash in Bank']) setCashInBank(data['Cash in Bank']);
                    if (data['New Customers']) setNewCustomers(data['New Customers']);
                    if (data['Total Customers']) setTotalCustomers(data['Total Customers']);
                    if (data['Churn Rate']) setChurnRate(data['Churn Rate']);
                    if (data['Highlights']) setKeyHighlights(data['Highlights']);
                    if (data['Challenges']) setKeyChallenges(data['Challenges']);
                    if (data['Next Focus']) setNextFocus(data['Next Focus']);
                }
            },
            error: (error: any) => {
                console.error("CSV Parse Error:", error);
                alert("Failed to parse CSV file.");
            }
        });
    };


    /**
     * Handles form submission.
     * It validates required fields, converts number strings to numbers, calculates net burn,
     * and calls the `onCreate` prop with the structured report data.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!monthStart) {
            alert('Please select the reporting month.');
            return;
        }
        if (!totalRevenue || isNaN(parseFloat(totalRevenue))) {
            alert('Please enter a valid total revenue.');
            return;
        }
        if (!totalExpenses || isNaN(parseFloat(totalExpenses))) {
            alert('Please enter a valid total expenses amount.');
            return;
        }

        const revenueNum = parseFloat(totalRevenue);
        const expensesNum = parseFloat(totalExpenses);
        const netBurn = revenueNum - expensesNum;

        onCreate({
            month_start: monthStart,
            total_revenue: revenueNum,
            total_expenses: expensesNum,
            net_burn: netBurn,
            cash_in_bank: parseFloat(cashInBank) || 0,
            mrr: parseFloat(mrr) || 0,
            churn_rate: parseFloat(churnRate) || 0,
            new_customers: parseInt(newCustomers, 10) || 0,
            total_customers: parseInt(totalCustomers, 10) || 0,
            key_highlights: keyHighlights,
            key_challenges: keyChallenges,
            next_focus: nextFocus,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Add New Monthly Report</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>

                <div className="px-6 pt-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Auto-fill with CSV</p>
                            <a href="/monthly_report_template.csv" download className="text-xs text-brand-primary hover:underline">Download Template</a>
                        </div>
                        <label className="cursor-pointer px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <span>Upload CSV</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

                        <FormField label="Month *" id="report-month">
                            <input type="date" id="report-month" value={monthStart} onChange={e => setMonthStart(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>

                        <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Financials</h3>
                        <FormRow>
                            <FormField label="Total Revenue *" id="report-revenue">
                                <input type="number" id="report-revenue" value={totalRevenue} onChange={e => setTotalRevenue(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 15000" />
                            </FormField>
                            <FormField label="Total Expenses *" id="report-expenses">
                                <input type="number" id="report-expenses" value={totalExpenses} onChange={e => setTotalExpenses(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., 25000" />
                            </FormField>
                        </FormRow>
                        <FormRow>
                            <FormField label="MRR" id="report-mrr">
                                <input type="number" id="report-mrr" value={mrr} onChange={e => setMrr(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                            <FormField label="Cash in Bank (End of Month)" id="report-cash">
                                <input type="number" id="report-cash" value={cashInBank} onChange={e => setCashInBank(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </FormRow>

                        <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Customers</h3>
                        <FormRow>
                            <FormField label="New Customers" id="report-new-customers">
                                <input type="number" id="report-new-customers" value={newCustomers} onChange={e => setNewCustomers(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                            <FormField label="Total Customers" id="report-total-customers">
                                <input type="number" id="report-total-customers" value={totalCustomers} onChange={e => setTotalCustomers(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </FormRow>
                        <FormField label="Churn Rate (%)" id="report-churn">
                            <input type="number" step="0.1" id="report-churn" value={churnRate} onChange={e => setChurnRate(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>

                        <h3 className="text-lg font-medium text-gray-800 border-t pt-4">Qualitative Summary</h3>
                        <FormField label="Key Highlights" id="report-highlights">
                            <textarea id="report-highlights" value={keyHighlights} onChange={e => setKeyHighlights(e.target.value)} rows={3} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <FormField label="Key Challenges" id="report-challenges">
                            <textarea id="report-challenges" value={keyChallenges} onChange={e => setKeyChallenges(e.target.value)} rows={3} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>
                        <FormField label="Next Month's Focus" id="report-focus">
                            <textarea id="report-focus" value={nextFocus} onChange={e => setNextFocus(e.target.value)} rows={3} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"></textarea>
                        </FormField>

                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Report</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateMonthlyReportModal;