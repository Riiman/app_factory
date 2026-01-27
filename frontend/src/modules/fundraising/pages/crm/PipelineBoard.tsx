import React, { useState } from 'react';
import { Investor, InvestorStage } from '@/types/dashboard-types';
import { MoreHorizontal, GripVertical } from 'lucide-react';
import Card from '@/components/Card';

interface PipelineBoardProps {
    investors: Investor[];
    onUpdateStage: (investorId: number, newStage: InvestorStage) => void;
    onInvestorClick: (investor: Investor) => void;
}

const STAGES = Object.values(InvestorStage);

const PipelineBoard: React.FC<PipelineBoardProps> = ({ investors, onUpdateStage, onInvestorClick }) => {
    const [draggedInvestorId, setDraggedInvestorId] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, investorId: number) => {
        setDraggedInvestorId(investorId);
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setData('text/plain', investorId.toString()); // Not strictly needed if state is used, but good practice
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, stage: InvestorStage) => {
        e.preventDefault();
        if (draggedInvestorId) {
            onUpdateStage(draggedInvestorId, stage);
            setDraggedInvestorId(null);
        }
    };

    const getStageColor = (stage: InvestorStage) => {
        switch (stage) {
            case InvestorStage.PROSPECT: return 'bg-gray-100 border-gray-200';
            case InvestorStage.CONTACTED: return 'bg-blue-50 border-blue-100';
            case InvestorStage.MEETING: return 'bg-yellow-50 border-yellow-100';
            case InvestorStage.DUE_DILIGENCE: return 'bg-purple-50 border-purple-100';
            case InvestorStage.TERM_SHEET: return 'bg-orange-50 border-orange-100';
            case InvestorStage.COMMITTED: return 'bg-green-50 border-green-100';
            case InvestorStage.PASSED: return 'bg-red-50 border-red-100';
            case InvestorStage.PORTFOLIO: return 'bg-indigo-50 border-indigo-100'; // Should be same as committed roughly
            default: return 'bg-gray-50 border-gray-100';
        }
    };

    const getStageTitleColor = (stage: InvestorStage) => {
        switch (stage) {
            case InvestorStage.PROSPECT: return 'text-gray-700';
            case InvestorStage.CONTACTED: return 'text-blue-700';
            case InvestorStage.MEETING: return 'text-yellow-700';
            case InvestorStage.DUE_DILIGENCE: return 'text-purple-700';
            case InvestorStage.TERM_SHEET: return 'text-orange-700';
            case InvestorStage.COMMITTED: return 'text-green-700';
            case InvestorStage.PASSED: return 'text-red-700';
            case InvestorStage.PORTFOLIO: return 'text-indigo-700';
            default: return 'text-gray-700';
        }
    };

    return (
        <div className="flex overflow-x-auto pb-4 gap-4 min-h-[calc(100vh-200px)]">
            {STAGES.map((stage) => {
                const stageInvestors = investors.filter(i => i.stage === stage || (!i.stage && stage === InvestorStage.PROSPECT));

                return (
                    <div
                        key={stage}
                        className={`flex-shrink-0 w-80 rounded-lg border-t-4 ${getStageColor(stage)} bg-gray-50 flex flex-col`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage)}
                    >
                        <div className="p-3 font-semibold text-sm uppercase tracking-wider flex justify-between items-center bg-white/50 border-b border-gray-100">
                            <span className={getStageTitleColor(stage)}>{stage.replace('_', ' ')}</span>
                            <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{stageInvestors.length}</span>
                        </div>

                        <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
                            {stageInvestors.map((investor) => (
                                <div
                                    key={investor.investor_id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, investor.investor_id)}
                                    onClick={() => onInvestorClick(investor)}
                                    className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow group relative"
                                >
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-medium text-gray-900 text-sm">{investor.name}</h4>
                                        <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{investor.firm_name}</p>

                                    {investor.check_size_interest && (
                                        <div className="mt-2 inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-100">
                                            ${(investor.check_size_interest / 1000).toFixed(0)}k Check
                                        </div>
                                    )}

                                    {investor.next_action_date && (
                                        <div className="mt-2 text-xs text-orange-600 flex items-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5"></span>
                                            Next: {new Date(investor.next_action_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {stageInvestors.length === 0 && (
                                <div className="h-20 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                    Drop to move here
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PipelineBoard;
