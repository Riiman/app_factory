import React from 'react';
import { TrendingUp, Target, Users, Zap, AlertTriangle, Activity } from 'lucide-react';

interface InsightsData {
    date: string;
    founder_maturity_score: number;
    product_readiness_score: number;
    market_fit_score: number;
    runway_months: number;
    financial_data: any;
    product_data: any;
    growth_data: any;
}

interface InsightsScoreCardsProps {
    insights: InsightsData | null;
}

const ScoreCard: React.FC<{
    title: string;
    score: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}> = ({ title, score, icon, color, subtitle }) => {
    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 40) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${color}`}>
                    {icon}
                </div>
                <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                    {score}
                </span>
            </div>
            <h4 className="text-sm font-semibold text-brand-text-primary">{title}</h4>
            {subtitle && <p className="text-xs text-brand-text-secondary mt-1">{subtitle}</p>}
        </div>
    );
};

const InsightsScoreCards: React.FC<InsightsScoreCardsProps> = ({ insights }) => {
    if (!insights) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                        No insights snapshot available yet. Snapshots are generated daily.
                    </p>
                </div>
            </div>
        );
    }

    const { financial_data, product_data, growth_data } = insights;

    // Extract advanced metrics
    const marginIllusion = financial_data?.margin_illusion || false;
    const falsePMF = growth_data?.false_pmf_signal || false;
    const zombieAssumptions = product_data?.experimentation?.zombie_assumptions || 0;
    const unitEconomicsGap = financial_data?.unit_economics_gap;

    const hasWarnings = marginIllusion || falsePMF || zombieAssumptions > 0 || (unitEconomicsGap && unitEconomicsGap < 0);

    return (
        <div className="mb-6">
            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <ScoreCard
                    title="Founder Maturity"
                    score={insights.founder_maturity_score}
                    icon={<Users className="h-5 w-5 text-purple-600" />}
                    color="bg-purple-50"
                    subtitle="Discipline & Hygiene"
                />
                <ScoreCard
                    title="Product Readiness"
                    score={insights.product_readiness_score}
                    icon={<Target className="h-5 w-5 text-blue-600" />}
                    color="bg-blue-50"
                    subtitle={`${product_data?.velocity || 0} features completed`}
                />
                <ScoreCard
                    title="Market Fit"
                    score={insights.market_fit_score}
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    color="bg-green-50"
                    subtitle={`${growth_data?.latest_churn?.toFixed(1) || 0}% churn`}
                />
                <ScoreCard
                    title="Learning Velocity"
                    score={product_data?.experimentation?.learning_cadence * 10 || 0}
                    icon={<Zap className="h-5 w-5 text-yellow-600" />}
                    color="bg-yellow-50"
                    subtitle={`${product_data?.experimentation?.kill_rate || 0}% kill rate`}
                />
            </div>

            {/* Advanced Warnings */}
            {hasWarnings && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ Business Health Warnings</h4>
                            <ul className="space-y-1 text-sm text-red-700">
                                {marginIllusion && (
                                    <li>• <strong>Margin Illusion:</strong> Burn rate growing faster than revenue</li>
                                )}
                                {falsePMF && (
                                    <li>• <strong>False PMF Signal:</strong> High growth but high churn ({growth_data.latest_churn}%)</li>
                                )}
                                {zombieAssumptions > 0 && (
                                    <li>• <strong>Zombie Assumptions:</strong> {zombieAssumptions} experiments planned &gt;60 days ago</li>
                                )}
                                {unitEconomicsGap && unitEconomicsGap < 0 && (
                                    <li>• <strong>Unit Economics Gap:</strong> ${Math.abs(unitEconomicsGap).toFixed(2)} below target ARPU</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Snapshot Date */}
            <div className="text-xs text-brand-text-secondary mt-2 flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                Last snapshot: {new Date(insights.date).toLocaleDateString()}
            </div>
        </div>
    );
};

export default InsightsScoreCards;
