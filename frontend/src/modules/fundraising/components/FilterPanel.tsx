import React, { useState } from 'react';
import { X, ChevronDown, DollarSign, MapPin, Briefcase, Filter as FilterIcon } from 'lucide-react';

interface FilterPanelProps {
    onFilterChange: (filters: InvestorFilters) => void;
    onClearFilters: () => void;
}

export interface InvestorFilters {
    sectors: string[];
    stages: string[];
    types: string[];
    locations: string[];
    minCheck?: number;
    maxCheck?: number;
}

const COMMON_SECTORS = [
    'FinTech', 'AI', 'SaaS', 'E-commerce', 'HealthTech', 'EdTech',
    'Enterprise', 'Consumer', 'B2B', 'B2C', 'Marketplace', 'DeepTech',
    'Climate', 'Web3', 'Crypto', 'Gaming', 'Social', 'Media'
];

const STAGES = [
    'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+'
];

const INVESTOR_TYPES = ['VC', 'Angel', 'Scout', 'Family Office', 'Corporate VC'];

const CHECK_SIZE_PRESETS = [
    { label: '$0-$500K', min: 0, max: 500000 },
    { label: '$500K-$1M', min: 500000, max: 1000000 },
    { label: '$1M-$5M', min: 1000000, max: 5000000 },
    { label: '$5M-$10M', min: 5000000, max: 10000000 },
    { label: '$10M+', min: 10000000, max: undefined },
];

const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange, onClearFilters }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<InvestorFilters>({
        sectors: [],
        stages: [],
        types: [],
        locations: [],
    });

    const updateFilters = (newFilters: Partial<InvestorFilters>) => {
        const updated = { ...filters, ...newFilters };
        setFilters(updated);
        onFilterChange(updated);
    };

    const toggleArrayFilter = (key: keyof Pick<InvestorFilters, 'sectors' | 'stages' | 'types' | 'locations'>, value: string) => {
        const current = filters[key] || [];
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        updateFilters({ [key]: updated });
    };

    const handleClearAll = () => {
        setFilters({
            sectors: [],
            stages: [],
            types: [],
            locations: [],
        });
        onClearFilters();
    };

    const hasActiveFilters = filters.sectors.length > 0 || filters.stages.length > 0 ||
        filters.types.length > 0 || filters.locations.length > 0 ||
        filters.minCheck !== undefined || filters.maxCheck !== undefined;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Filters</span>
                    {hasActiveFilters && (
                        <span className="bg-brand-primary text-white text-xs px-2 py-0.5 rounded-full">
                            {filters.sectors.length + filters.stages.length + filters.types.length}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                    {/* Investor Types */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Investor Type</label>
                        <div className="flex flex-wrap gap-2">
                            {INVESTOR_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => toggleArrayFilter('types', type)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filters.types.includes(type)
                                            ? 'bg-brand-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sectors */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Briefcase className="w-4 h-4 inline mr-1" />
                            Sectors
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_SECTORS.map(sector => (
                                <button
                                    key={sector}
                                    onClick={() => toggleArrayFilter('sectors', sector)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filters.sectors.includes(sector)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {sector}
                                    {filters.sectors.includes(sector) && (
                                        <X className="w-3 h-3 inline ml-1" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stages */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Investment Stage</label>
                        <div className="flex flex-wrap gap-2">
                            {STAGES.map(stage => (
                                <button
                                    key={stage}
                                    onClick={() => toggleArrayFilter('stages', stage)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filters.stages.includes(stage)
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {stage}
                                    {filters.stages.includes(stage) && (
                                        <X className="w-3 h-3 inline ml-1" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Check Size Presets */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            Check Size Range
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CHECK_SIZE_PRESETS.map(preset => {
                                const isActive = filters.minCheck === preset.min && filters.maxCheck === preset.max;
                                return (
                                    <button
                                        key={preset.label}
                                        onClick={() => updateFilters({ minCheck: preset.min, maxCheck: preset.max })}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <div className="pt-2 border-t border-gray-100">
                            <button
                                onClick={handleClearAll}
                                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterPanel;
