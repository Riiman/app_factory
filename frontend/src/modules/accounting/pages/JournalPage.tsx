import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { JournalEntry, Account } from '@/types/dashboard-types';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simple modal for manual entry is omitted for brevity in this step, 
// as the user focused on "Transaction" style inputs, but we list entries here.

const JournalPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: journalEntries = [], isLoading } = useQuery<JournalEntry[]>({
        queryKey: ['journal', user?.startup_id],
        queryFn: () => api.get(`/startups/${user?.startup_id}/accounting/journal`),
        enabled: !!user?.startup_id
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading journal...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
                    <p className="text-gray-500 text-sm">A complete chronological record of all financial transactions.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-medium text-gray-500 w-32">Date</th>
                            <th className="px-6 py-3 font-medium text-gray-500 w-32">Reference</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Description</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Account</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-right w-32">Debit</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-right w-32">Credit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {journalEntries.map((entry) => (
                            <React.Fragment key={entry.id}>
                                {entry.lines.map((line, index) => (
                                    <tr key={line.id} className={index === 0 ? "bg-white" : "bg-white"}>
                                        {index === 0 && (
                                            <>
                                                <td className="px-6 py-4 text-gray-900 border-r border-gray-100 align-top" rowSpan={entry.lines.length}>
                                                    <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 border-r border-gray-100 align-top" rowSpan={entry.lines.length}>
                                                    {entry.reference ? (
                                                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">
                                                            {entry.reference}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 border-r border-gray-100 align-top" rowSpan={entry.lines.length}>
                                                    <div className="font-medium">{entry.description || 'Journal Entry'}</div>
                                                    <div className="text-xs text-gray-400 mt-1">ID: #{entry.id}</div>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-2 text-gray-700 border-b border-gray-50">
                                            <div className="font-medium">{line.account_name}</div>
                                            {line.description && line.description !== entry.description && (
                                                <div className="text-xs text-gray-400">{line.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-2 text-right text-gray-900 border-b border-gray-50 font-mono">
                                            {line.debit > 0 ? `$${line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                        </td>
                                        <td className="px-6 py-2 text-right text-gray-900 border-b border-gray-50 font-mono">
                                            {line.credit > 0 ? `$${line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                        </td>
                                    </tr>
                                ))}
                                {/* Divider row between entries */}
                                <tr>
                                    <td colSpan={6} className="h-4 bg-gray-50 border-t border-gray-200"></td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                {journalEntries.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No transactions found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalPage;
