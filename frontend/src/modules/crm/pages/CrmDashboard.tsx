import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { CrmDeal, CrmDealStage } from '../types';
import { Plus, RefreshCw } from 'lucide-react';
import CreateDealModal from '../components/CreateDealModal';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Re-map stages to friendly names and order
const STAGES = Object.values(CrmDealStage);

const CrmDashboard: React.FC = () => {
    const [deals, setDeals] = useState<CrmDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
    const [syncing, setSyncing] = useState(false);

    const fetchDeals = async () => {
        setLoading(true);
        try {
            const data = await crmApi.getDeals();
            setDeals(data);
        } catch (error) {
            console.error("Failed to fetch deals", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeals();
    }, []);

    const handleDragStart = (e: React.DragEvent, dealId: number) => {
        setDraggedDealId(dealId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, stage: CrmDealStage) => {
        e.preventDefault();
        if (draggedDealId) {
            const dealId = draggedDealId;
            const currentDeal = deals.find(d => d.id === dealId);

            // Optimization: Don't do anything if dropping in same stage
            if (currentDeal && currentDeal.stage === stage) {
                setDraggedDealId(null);
                return;
            }

            // Optimistic Update
            const updatedDeals = deals.map(d =>
                d.id === dealId ? { ...d, stage: stage } : d
            );
            setDeals(updatedDeals);
            setDraggedDealId(null);

            try {
                await crmApi.updateDeal(dealId, { stage });
            } catch (error) {
                console.error("Failed to update deal stage", error);
                fetchDeals(); // Revert
            }
        }
    };

    const getDealsByStage = (stage: string) => {
        return deals.filter(d => d.stage === stage);
    };

    const getStageColor = (stage: string) => {
        // Simple color mapping based on index or name, matching Investor CRM style somewhat
        switch (stage) {
            case CrmDealStage.APPOINTMENT_SCHEDULED: return 'bg-gray-100 border-gray-200';
            case CrmDealStage.QUALIFIED_TO_BUY: return 'bg-blue-50 border-blue-100';
            case CrmDealStage.PRESENTATION_SCHEDULED: return 'bg-yellow-50 border-yellow-100';
            case CrmDealStage.DECISION_MAKER_BOUGHT_IN: return 'bg-purple-50 border-purple-100';
            case CrmDealStage.CONTRACT_SENT: return 'bg-orange-50 border-orange-100';
            case CrmDealStage.CLOSED_WON: return 'bg-green-50 border-green-100';
            case CrmDealStage.CLOSED_LOST: return 'bg-red-50 border-red-100';
            default: return 'bg-gray-50 border-gray-100';
        }
    };

    const getStageTitleColor = (stage: string) => {
        switch (stage) {
            case CrmDealStage.APPOINTMENT_SCHEDULED: return 'text-gray-700';
            case CrmDealStage.QUALIFIED_TO_BUY: return 'text-blue-700';
            case CrmDealStage.PRESENTATION_SCHEDULED: return 'text-yellow-700';
            case CrmDealStage.DECISION_MAKER_BOUGHT_IN: return 'text-purple-700';
            case CrmDealStage.CONTRACT_SENT: return 'text-orange-700';
            case CrmDealStage.CLOSED_WON: return 'text-green-700';
            case CrmDealStage.CLOSED_LOST: return 'text-red-700';
            default: return 'text-gray-700';
        }
    };

    if (loading && deals.length === 0) return <div className="p-6">Loading Pipeline...</div>;

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
                <div className="flex space-x-3">
                    <button
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                        onClick={async () => {
                            setSyncing(true);
                            try {
                                const res = await crmApi.syncEmails();
                                alert(`Synced ${res.synced_count} new emails.`);
                            } catch (e) {
                                console.error(e);
                                alert("Failed to sync emails.");
                            } finally {
                                setSyncing(false);
                            }
                        }}
                        disabled={syncing}
                    >
                        <RefreshCw className={`-ml-1 mr-2 h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Emails'}
                    </button>
                    <button
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                        New Deal
                    </button>
                </div>
            </div>

            {showCreateModal && (
                <CreateDealModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchDeals();
                    }}
                />
            )}

            <div className="flex overflow-x-auto pb-4 gap-4 flex-1">
                {STAGES.map((stage) => {
                    const stageDeals = getDealsByStage(stage);
                    const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.amount), 0);

                    return (
                        <div
                            key={stage}
                            className={`flex-shrink-0 w-80 rounded-lg border-t-4 ${getStageColor(stage)} bg-gray-50 flex flex-col`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage)}
                        >
                            <div className="p-3 font-semibold text-sm uppercase tracking-wider flex justify-between items-center bg-white/50 border-b border-gray-100">
                                <span className={getStageTitleColor(stage)}>{stage.replace(/_/g, ' ')}</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-gray-500 text-xs">{stageDeals.length} deals</span>
                                    <span className="text-gray-900 text-xs font-semibold">{formatCurrency(totalValue)}</span>
                                </div>
                            </div>

                            <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
                                {stageDeals.map((deal) => (
                                    <div
                                        key={deal.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, deal.id)}
                                        className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow group relative"
                                    >
                                        <div className="font-medium text-gray-900">{deal.name}</div>
                                        <div className="text-sm text-gray-500 mt-1">{deal.company_name || deal.contact_name || 'Unknown Contact'}</div>
                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(deal.amount)}</span>
                                            {deal.close_date && (
                                                <span className="text-xs text-gray-400">{new Date(deal.close_date).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {stageDeals.length === 0 && (
                                    <div className="h-20 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                        Drop to move here
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CrmDashboard;
