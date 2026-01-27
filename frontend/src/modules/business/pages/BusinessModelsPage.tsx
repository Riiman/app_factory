import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Plus, Trash, Edit, AlertCircle } from 'lucide-react';
import { BusinessModel, Account, AccountType, BusinessModelType } from '@/types/dashboard-types';

const BusinessModelsPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<BusinessModel | null>(null);

    // Fetch Business Models
    const { data: businessModels = [] } = useQuery<BusinessModel[]>({
        queryKey: ['business-models', user?.startup_id],
        queryFn: async () => {
            const res = await api.get(`/startups/${user?.startup_id}/business-models`);
            console.log('📊 Business Models API Response:', res);
            console.log('📊 Business Models Data:', res.business_models);
            return res.business_models;
        },
        enabled: !!user?.startup_id
    });

    // Fetch Accounts for mapping
    const { data: accounts = [] } = useQuery<Account[]>({
        queryKey: ['accounts', user?.startup_id],
        queryFn: () => user?.startup_id ? api.get(`/startups/${user?.startup_id}/accounting/accounts`) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const incomeAccounts = accounts.filter(a => a.type === AccountType.INCOME || a.type === AccountType.ASSET);
    const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSE || a.type === AccountType.LIABILITY);

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/startups/${user?.startup_id}/business-models/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-models'] })
    });



    interface PriceTier {
        name: string;
        price: number;
        interval: 'MONTHLY' | 'YEARLY' | 'ONE_TIME';
        features: string[];
    }

    // Render Form Modal (Simplistic inline for now)
    const ModelForm = ({ model, onClose }: { model?: BusinessModel, onClose: () => void }) => {
        const [formData, setFormData] = useState<Partial<BusinessModel>>({
            name: model?.name || '',
            description: model?.description || '',
            model_type: model?.model_type || 'TRANSACTIONAL',
            revenue_account_id: model?.revenue_account_id,
            cost_account_id: model?.cost_account_id,
            target_arpu: model?.target_arpu,
            target_cac: model?.target_cac,
            target_margin: model?.target_margin
        });

        // Load initial tiers from model_config or start empty
        const [tiers, setTiers] = useState<PriceTier[]>(model?.model_config?.tiers || []);
        const [showAccounting, setShowAccounting] = useState(false);

        const saveMutation = useMutation({
            mutationFn: (data: Partial<BusinessModel>) => {
                const url = model
                    ? `/startups/${user?.startup_id}/business-models/${model.id}`
                    : `/startups/${user?.startup_id}/business-models`;
                const method = model ? 'PUT' : 'POST';

                // Pack tiers into model_config
                const finalData = {
                    ...data,
                    model_config: { ...model?.model_config, tiers }
                };

                return api.request(method, url, finalData);
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['business-models'] });
                onClose();
            }
        });

        const addTier = () => {
            setTiers([...tiers, { name: 'New Tier', price: 0, interval: 'MONTHLY', features: [] }]);
        };

        const updateTier = (index: number, field: keyof PriceTier, value: any) => {
            const newTiers = [...tiers];
            newTiers[index] = { ...newTiers[index], [field]: value };
            setTiers(newTiers);
        };

        const removeTier = (index: number) => {
            setTiers(tiers.filter((_, i) => i !== index));
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">{model ? 'Edit Business Model' : 'New Business Model'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="e.g. Enterprise SaaS Plan"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select
                                value={formData.model_type}
                                onChange={e => setFormData({ ...formData, model_type: e.target.value as BusinessModelType })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            >
                                <option value="TRANSACTIONAL">Transactional</option>
                                <option value="SUBSCRIPTION">Subscription</option>
                                <option value="SERVICE">Service</option>
                                <option value="MARKETPLACE">Marketplace</option>
                                <option value="ADVERTISING">Advertising</option>
                                <option value="HYBRID">Hybrid</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                rows={2}
                            />
                        </div>

                        {/* Pricing Tiers Builder */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Pricing Tiers</label>
                                <button type="button" onClick={addTier} className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                                    <Plus size={12} className="mr-1" /> Add Tier
                                </button>
                            </div>
                            <div className="space-y-3">
                                {tiers.map((tier, idx) => (
                                    <div key={idx} className="border rounded-md p-3 bg-gray-50 relative group">
                                        <button
                                            onClick={() => removeTier(idx)}
                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash size={14} />
                                        </button>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={tier.name}
                                                onChange={(e) => updateTier(idx, 'name', e.target.value)}
                                                className="text-sm font-medium bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                                                placeholder="Tier Name"
                                            />
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={tier.price}
                                                    onChange={(e) => updateTier(idx, 'price', parseFloat(e.target.value))}
                                                    className="text-sm bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none w-20"
                                                    placeholder="0.00"
                                                />
                                                <select
                                                    value={tier.interval}
                                                    onChange={(e) => updateTier(idx, 'interval', e.target.value)}
                                                    className="text-xs bg-transparent border-none text-gray-500 focus:ring-0"
                                                >
                                                    <option value="MONTHLY">/mo</option>
                                                    <option value="YEARLY">/yr</option>
                                                    <option value="ONE_TIME">one-time</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tiers.length === 0 && (
                                    <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-md text-gray-400 text-sm">
                                        No pricing tiers defined.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Proforma Section */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                            <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Unit Economics Targets
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-blue-800">Target ARPU ($)</label>
                                    <input
                                        type="number"
                                        value={formData.target_arpu || ''}
                                        onChange={e => setFormData({ ...formData, target_arpu: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full border border-blue-200 rounded-md shadow-sm p-2 text-sm"
                                        placeholder="e.g. 50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-blue-800">Target CAC ($)</label>
                                    <input
                                        type="number"
                                        value={formData.target_cac || ''}
                                        onChange={e => setFormData({ ...formData, target_cac: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full border border-blue-200 rounded-md shadow-sm p-2 text-sm"
                                        placeholder="e.g. 500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-blue-800">Target Gross Margin (%)</label>
                                    <input
                                        type="number"
                                        value={formData.target_margin || ''}
                                        onChange={e => setFormData({ ...formData, target_margin: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full border border-blue-200 rounded-md shadow-sm p-2 text-sm"
                                        placeholder="e.g. 80"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Accounting Linkage (Optional) */}
                        <div className="border border-gray-200 rounded-lg p-3">
                            <button
                                onClick={() => setShowAccounting(!showAccounting)}
                                className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
                            >
                                <span>Advanced: Accounting Integration</span>
                                <span className="text-gray-400">{showAccounting ? '−' : '+'}</span>
                            </button>

                            {showAccounting && (
                                <div className="mt-3 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">Revenue Account</label>
                                        <select
                                            value={formData.revenue_account_id || ''}
                                            onChange={e => setFormData({ ...formData, revenue_account_id: e.target.value ? Number(e.target.value) : undefined })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                                        >
                                            <option value="">-- None (Manual) --</option>
                                            {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">Cost Account</label>
                                        <select
                                            value={formData.cost_account_id || ''}
                                            onChange={e => setFormData({ ...formData, cost_account_id: e.target.value ? Number(e.target.value) : undefined })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                                        >
                                            <option value="">-- None (Manual) --</option>
                                            {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button
                            onClick={() => saveMutation.mutate(formData)}
                            disabled={!formData.name}
                            className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Business Models</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-opacity-90"
                >
                    <Plus size={20} className="mr-2" /> New Model
                </button>
            </div>

            {businessModels.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Business Models Defined</h3>
                    <p className="mt-2 text-gray-500">Create a business model to define how you generate revenue.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {businessModels.map(model => (
                        <Card key={model.id} className="relative group">
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingModel(model)} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={16} /></button>
                                <button onClick={() => deleteMutation.mutate(model.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash size={16} /></button>
                            </div>
                            <div className="mb-4">
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {model.model_type}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2">{model.name}</h3>
                            <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden text-ellipsis whitespace-nowrap">{model.description || 'No description provided.'}</p>

                            {/* Tier Summary Badge */}
                            {model.model_config?.tiers && Array.isArray(model.model_config.tiers) && model.model_config.tiers.length > 0 && (
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        {model.model_config.tiers.length} Tiers
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {Math.min(...model.model_config.tiers.map((t: any) => t.price)) === Math.max(...model.model_config.tiers.map((t: any) => t.price))
                                            ? `$${model.model_config.tiers[0].price}`
                                            : `$${Math.min(...model.model_config.tiers.map((t: any) => t.price))} - $${Math.max(...model.model_config.tiers.map((t: any) => t.price))}`
                                        }
                                    </span>
                                </div>
                            )}


                            {/* Performance Metrics Display */}
                            <div className="space-y-3 mb-4">
                                {/* Actual Performance (if data exists) */}
                                {model.actual_revenue && model.actual_revenue > 0 ? (
                                    <>
                                        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-100">
                                            <div className="text-xs font-semibold text-green-800 mb-2 flex items-center justify-between">
                                                <span>📊 Actual Performance</span>
                                                <span className="text-[10px] bg-green-200 px-2 py-0.5 rounded-full">{model.transaction_count} txns</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div>
                                                    <div className="text-[10px] text-gray-600">ARPU</div>
                                                    <div className="font-bold text-sm text-gray-900">${model.actual_arpu?.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-600">Revenue</div>
                                                    <div className="font-bold text-sm text-green-600">${model.actual_revenue.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-600">Margin</div>
                                                    <div className={`font-bold text-sm ${model.actual_margin && model.actual_margin > 50 ? 'text-green-600' : 'text-gray-900'}`}>
                                                        {model.actual_margin?.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-gray-500 text-center mt-1">{model.actual_quantity?.toFixed(0)} units sold</div>
                                        </div>

                                        {/* Target Comparison */}
                                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                            <div className="text-[10px] font-medium text-gray-500 mb-1">🎯 Targets</div>
                                            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                                                <div className="text-gray-600">
                                                    {model.target_arpu ? `$${model.target_arpu}` : '-'}
                                                </div>
                                                <div className="text-gray-600">
                                                    {model.target_cac ? `$${model.target_cac} CAC` : '-'}
                                                </div>
                                                <div className="text-gray-600">
                                                    {model.target_margin ? `${model.target_margin}%` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Target Metrics (when no actual data) */
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">🎯 Target Metrics</div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <div className="text-xs text-gray-500">ARPU</div>
                                                <div className="font-semibold text-gray-900">{model.target_arpu ? `$${model.target_arpu}` : '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">CAC</div>
                                                <div className="font-semibold text-gray-900">{model.target_cac ? `$${model.target_cac}` : '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">Margin</div>
                                                <div className={`font-semibold ${model.target_margin && model.target_margin > 50 ? 'text-green-600' : 'text-gray-900'}`}>
                                                    {model.target_margin ? `${model.target_margin}%` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-3 space-y-1 text-xs text-gray-500">
                                <div className="flex justify-between items-center">
                                    <span>Accounting Link:</span>
                                    {model.revenue_account_name ? (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px]">Active</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">Optional</span>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {isCreateModalOpen && <ModelForm onClose={() => setIsCreateModalOpen(false)} />}
            {editingModel && <ModelForm model={editingModel} onClose={() => setEditingModel(null)} />}
        </div>
    );
};

export default BusinessModelsPage;
