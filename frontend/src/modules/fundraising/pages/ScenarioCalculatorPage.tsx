import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Calculator, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface ScenarioCalculatorPageProps {
    startupId: number;
}

const ScenarioCalculatorPage: React.FC<ScenarioCalculatorPageProps> = ({ startupId }) => {
    const [inputs, setInputs] = useState({
        new_investment: 1000000,
        pre_money_valuation: 5000000
    });

    // Fetch cap table to verify we have data
    const { data: capTable = [] } = useQuery({
        queryKey: ['capTable', startupId],
        queryFn: () => api.getCapTable(startupId)
    });

    const mutation = useMutation({
        mutationFn: (data: typeof inputs) => api.calculateDilution(startupId, data.new_investment, data.pre_money_valuation)
    });

    const handleCalculate = () => {
        mutation.mutate(inputs);
    };

    const result = mutation.data;

    if (capTable.length === 0) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">One Last Step</h3>
                <p className="mt-2 text-gray-500">Please populate your Cap Table first before running scenarios.</p>
                <a href="#fundraising/cap-table" className="text-brand-primary mt-4 inline-block hover:underline">Go to Cap Table</a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Scenario Calculator</h1>
                    <p className="text-gray-500 mt-1">Simulate funding rounds and visualize dilution.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inputs */}
                <div className="lg:col-span-1 space-y-6">
                    <Card title="Round Parameters">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Raising Amount ($)</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                        value={inputs.new_investment}
                                        onChange={(e) => setInputs({ ...inputs, new_investment: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Pre-Money Valuation ($)</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                        value={inputs.pre_money_valuation}
                                        onChange={(e) => setInputs({ ...inputs, pre_money_valuation: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Resulting Post-Money: {formatCurrency(inputs.pre_money_valuation + inputs.new_investment)}
                                </p>
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={mutation.isPending}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                            >
                                {mutation.isPending ? 'Calculating...' : 'Run Simulation'}
                            </button>
                        </div>
                    </Card>

                    {result && (
                        <Card title="Round Summary">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Pre-Money Valuation</span>
                                    <span className="font-medium">{formatCurrency(result.pre_money_valuation)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Post-Money Valuation</span>
                                    <span className="font-medium text-brand-primary">{formatCurrency(result.post_money_valuation)}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Founder Dilution</span>
                                        <span className="font-bold text-red-600 text-lg">-{result.dilution_percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Results Table */}
                <div className="lg:col-span-2">
                    <Card title="Pro-Forma Cap Table">
                        {!result ? (
                            <div className="text-center py-12 text-gray-500">
                                <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Run a simulation to see the new cap table structure.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stakeholder</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pre-Money %</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"><ArrowRight className="h-4 w-4 mx-auto" /></th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Post-Money %</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {result.cap_table.map((entry: any, idx: number) => {
                                            // Calculate original % (Need original cap table for this precisely, but can infer from dilution or just skip pre-money column if complex)
                                            // Actually scenario service returns 'updated_ownership' list.
                                            // Let's assume we can calculate it relative to non-new investors? 
                                            // Keep it simple: showing only post-money is fine, or we can improve ScenarioService to return both.
                                            // Currently ScenarioService returns `ownership_percentage` which is POST.

                                            return (
                                                <tr key={idx} className={entry.is_new ? "bg-green-50" : ""}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {entry.stakeholder_name}
                                                        {entry.is_new && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">New</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                        {/* ToDo: Show Pre-Money from local state? */}
                                                        -
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400">
                                                        <ArrowRight className="h-3 w-3 mx-auto" />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-primary text-right">
                                                        {entry.ownership_percentage}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                        {formatCurrency(entry.post_money_value)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ScenarioCalculatorPage;
