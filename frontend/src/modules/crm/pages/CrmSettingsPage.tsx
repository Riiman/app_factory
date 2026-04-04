import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { CrmSyncRule, SyncRuleType } from '../types';
import { Plus, Trash2, Ban } from 'lucide-react';

const CrmSettingsPage: React.FC = () => {
    const [rules, setRules] = useState<CrmSyncRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRuleType, setNewRuleType] = useState<SyncRuleType>(SyncRuleType.DOMAIN);
    const [newRuleValue, setNewRuleValue] = useState('');

    const fetchRules = async () => {
        try {
            const data = await crmApi.getSyncRules();
            setRules(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await crmApi.createSyncRule({ rule_type: newRuleType, value: newRuleValue });
            setNewRuleValue('');
            fetchRules();
        } catch (error) {
            alert('Failed to add rule');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await crmApi.deleteSyncRule(id);
            fetchRules();
        } catch (error) {
            alert('Failed to delete rule');
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">CRM Settings</h1>

            <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Email Sync - Negative List
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Define rules to prevent specific emails from being synced to the CRM.
                    </p>
                </div>

                <div className="p-6 bg-gray-50 border-b border-gray-200">
                    <form onSubmit={handleAddRule} className="flex gap-4 items-end">
                        <div className="flex-shrink-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={newRuleType}
                                onChange={(e) => setNewRuleType(e.target.value as SyncRuleType)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white"
                            >
                                <option value={SyncRuleType.DOMAIN}>Domain (@example.com)</option>
                                <option value={SyncRuleType.EMAIL}>Email Address</option>
                                <option value={SyncRuleType.SUBJECT}>Subject Keyword</option>
                            </select>
                        </div>
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Value to Ignore</label>
                            <input
                                type="text"
                                required
                                placeholder={newRuleType === SyncRuleType.DOMAIN ? 'competitor.com' : newRuleType === SyncRuleType.EMAIL ? 'spam@example.com' : 'Receipt'}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                value={newRuleValue}
                                onChange={(e) => setNewRuleValue(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            Block
                        </button>
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Delete</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Loading rules...</td></tr>
                            ) : rules.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No ignore rules defined.</td></tr>
                            ) : (
                                rules.map((rule) => (
                                    <tr key={rule.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rule.rule_type === SyncRuleType.DOMAIN ? 'bg-blue-100 text-blue-800' : rule.rule_type === SyncRuleType.EMAIL ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {rule.rule_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{rule.value}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleDelete(rule.id)} className="text-red-600 hover:text-red-900">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CrmSettingsPage;
