import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { GlobalInvestor, InvestorStage } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Search, Plus, ExternalLink, Globe, MapPin, DollarSign, Briefcase, Filter, ChevronDown, Linkedin, Eye, Sparkles, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import GlobalInvestorDetailModal from '../components/GlobalInvestorDetailModal';
import FilterPanel, { InvestorFilters } from '../components/FilterPanel';

interface InvestorDatabasePageProps {
    startupId: number;
}

const InvestorDatabasePage: React.FC<InvestorDatabasePageProps> = ({ startupId }) => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [allInvestors, setAllInvestors] = useState<GlobalInvestor[]>([]);
    const [isAdding, setIsAdding] = useState<number | null>(null);
    const [selectedInvestor, setSelectedInvestor] = useState<GlobalInvestor | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filters, setFilters] = useState<InvestorFilters>({
        sectors: [],
        stages: [],
        types: [],
        locations: [],
    });
    const [activeTab, setActiveTab] = useState<'browse' | 'recommended'>('browse');

    const ITEMS_PER_PAGE = 51; // 17 rows × 3 columns

    // Fetch Investors with pagination and filters
    const { data: browseData, isLoading: isLoadingBrowse, isFetching: isFetchingBrowse } = useQuery({
        queryKey: ['globalInvestors', startupId, page, searchQuery, filters],
        queryFn: async () => {
            const result = await api.getGlobalInvestors(startupId, {
                page,
                limit: ITEMS_PER_PAGE,
                search: searchQuery,
                types: filters.types.join(','),
                sectors: filters.sectors.join(','),
                stages: filters.stages.join(','),
                minCheck: filters.minCheck,
                maxCheck: filters.maxCheck,
            });

            // Accumulate investors for "Load More" pattern
            if (page === 1) {
                setAllInvestors(result.investors);
            } else {
                setAllInvestors(prev => [...prev, ...result.investors]);
            }

            return result;
        },
        enabled: activeTab === 'browse'
    });

    // Fetch Recommended Investors
    const { data: recommendedData, isLoading: isLoadingRec } = useQuery({
        queryKey: ['recommendedInvestors', startupId],
        queryFn: async () => {
            const res = await api.getRecommendedInvestors(startupId);
            return res.recommended;
        },
        enabled: activeTab === 'recommended'
    });

    // Reset to page 1 when search or filters change
    React.useEffect(() => {
        if (activeTab === 'browse') {
            setPage(1);
            setAllInvestors([]);
        }
    }, [searchQuery, filters, activeTab]);

    // Mutation to add investor to pipeline
    const addInvestorMutation = useMutation({
        mutationFn: async (investor: GlobalInvestor) => {
            return api.createInvestor(startupId, {
                name: investor.name,
                firm_name: investor.firm_name,
                type: investor.types?.[0] || 'VC',
                website: investor.website,
                global_investor_id: investor.id,
                stage: InvestorStage.PROSPECT,
                notes: `Imported from Global Database. Focus: ${investor.focus_sectors?.join(', ')}`
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investors', startupId] });
            alert("Investor added to your pipeline!");
        },
        onError: (err) => {
            alert("Failed to add investor. They might already be in your pipeline.");
        }
    });

    const handleAddToPipeline = async (investor: GlobalInvestor) => {
        setIsAdding(investor.id);
        try {
            await addInvestorMutation.mutateAsync(investor);
        } finally {
            setIsAdding(null);
        }
    };

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    const handleViewDetails = (investor: GlobalInvestor) => {
        setSelectedInvestor(investor);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedInvestor(null);
    };

    const handleFilterChange = (newFilters: InvestorFilters) => {
        setFilters(newFilters);
    };

    const handleClearFilters = () => {
        setFilters({
            sectors: [],
            stages: [],
            types: [],
            locations: [],
        });
    };

    const hasMore = browseData?.pagination?.has_next || false;
    const totalCount = browseData?.pagination?.total || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Investor Database</h1>
                    <p className="text-gray-500 mt-1">
                        Browse and find investors for your startup.
                        {activeTab === 'browse' && totalCount > 0 && <span className="ml-1">({totalCount.toLocaleString()} total)</span>}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`${activeTab === 'browse'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <Globe className="w-4 h-4 mr-2" />
                        Browse Database
                    </button>
                    <button
                        onClick={() => setActiveTab('recommended')}
                        className={`${activeTab === 'recommended'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Recommended for You
                    </button>
                </nav>
            </div>

            {activeTab === 'browse' ? (
                <>
                    {/* Filter Panel */}
                    <FilterPanel
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                    />

                    {/* Search */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search investors by name or firm..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Results Grid */}
                    {isLoadingBrowse && page === 1 ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading investors...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {allInvestors?.map((investor: GlobalInvestor) => (
                                    <div key={investor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center">
                                                {investor.logo_url ? (
                                                    <img src={api.getAssetUrl(investor.logo_url)} alt="" className="h-10 w-10 rounded-full object-contain bg-gray-50 p-1 mr-3 flex-shrink-0" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-bold mr-3 flex-shrink-0">
                                                        {investor.name[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900 line-clamp-1">{investor.name}</h3>
                                                    {investor.title && (
                                                        <p className="text-sm text-gray-600">{investor.title}</p>
                                                    )}
                                                    {investor.firm_name && (
                                                        <p className="text-sm text-gray-500">{investor.firm_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 flex-1">
                                            {investor.focus_sectors && (
                                                <div className="flex flex-wrap gap-2">
                                                    {investor.focus_sectors.slice(0, 3).map((sector, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {sector}
                                                        </span>
                                                    ))}
                                                    {investor.focus_sectors.length > 3 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            +{investor.focus_sectors.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center">
                                                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span>{investor.locations?.join(', ') || 'Global'}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span>
                                                        {investor.sweet_spot
                                                            ? formatCurrency(investor.sweet_spot)
                                                            : investor.min_check_size
                                                                ? `${formatCurrency(investor.min_check_size)} - ${formatCurrency(investor.max_check_size || 0)}`
                                                                : 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <Filter className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span>
                                                        {investor.focus_stages
                                                            ?.filter(stage => !stage.includes('Other Lists'))
                                                            .join(', ') || 'Any Stage'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {investor.linkedin && (
                                                    <a
                                                        href={investor.linkedin}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-gray-500 hover:text-brand-primary flex items-center"
                                                    >
                                                        <Linkedin className="w-4 h-4 mr-1" />
                                                        LinkedIn
                                                    </a>
                                                )}
                                                {investor.website && (
                                                    <a
                                                        href={investor.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-gray-500 hover:text-brand-primary flex items-center"
                                                    >
                                                        <Globe className="w-4 h-4 mr-1" />
                                                        Website
                                                    </a>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleViewDetails(investor)}
                                                className="text-sm text-brand-primary hover:text-brand-dark hover:underline flex items-center font-medium transition-colors"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Details
                                            </button>
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                onClick={() => handleAddToPipeline(investor)}
                                                disabled={isAdding === investor.id}
                                                className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                                            >
                                                {isAdding === investor.id ? (
                                                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Add to Pipeline
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {!isLoadingBrowse && allInvestors?.length === 0 && (
                                    <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                                        <p className="text-gray-500">No investors found matching your criteria.</p>
                                    </div>
                                )}
                            </div>

                            {/* Load More Button */}
                            {hasMore && (
                                <div className="flex justify-center pt-6">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={isFetchingBrowse}
                                        className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                                    >
                                        {isFetchingBrowse ? (
                                            <>
                                                <div className="animate-spin h-5 w-5 border-b-2 border-brand-primary rounded-full mr-2"></div>
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-5 h-5 mr-2" />
                                                Load More ({allInvestors.length} of {totalCount})
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Recommended Tab Info */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start mb-6">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-medium text-blue-800">About Recommendations</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                We match investors based on your sector, stage, location, and check size preferences.
                                Complete your startup profile to get better recommendations.
                            </p>
                        </div>
                    </div>

                    {/* Recommended Results Grid */}
                    {isLoadingRec ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                            <p className="mt-4 text-gray-500">Finding best matches...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendedData?.map((item: any) => {
                                const investor = item.investor;
                                return (
                                    <div key={investor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col h-full relative overflow-hidden">
                                        {/* Match Score Badge */}
                                        <div className="absolute top-0 right-0 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-bl-lg border-l border-b border-green-100 flex items-center z-10">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            {item.score}% Match
                                        </div>

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center">
                                                {investor.logo_url ? (
                                                    <img src={api.getAssetUrl(investor.logo_url)} alt="" className="h-10 w-10 rounded-full object-contain bg-gray-50 p-1 mr-3 flex-shrink-0" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-bold mr-3 flex-shrink-0">
                                                        {investor.name[0]}
                                                    </div>
                                                )}
                                                <div className="max-w-[160px]">
                                                    <h3 className="text-lg font-medium text-gray-900 line-clamp-1">{investor.name}</h3>
                                                    {investor.title && (
                                                        <p className="text-sm text-gray-600 truncate">{investor.title}</p>
                                                    )}
                                                    {investor.firm_name && (
                                                        <p className="text-sm text-gray-500 truncate">{investor.firm_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 flex-1">
                                            {/* Match Reasons */}
                                            <div className="mb-3">
                                                <div className="app-scroll-hide flex gap-1 overflow-x-auto pb-1">
                                                    {item.match_reasons?.map((reason: string, idx: number) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100 whitespace-nowrap">
                                                            ✓ {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {investor.focus_sectors && (
                                                <div className="flex flex-wrap gap-2">
                                                    {investor.focus_sectors.slice(0, 3).map((sector: string, idx: number) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {sector}
                                                        </span>
                                                    ))}
                                                    {investor.focus_sectors.length > 3 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            +{investor.focus_sectors.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center">
                                                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span>{investor.locations?.join(', ') || 'Global'}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span>
                                                        {investor.sweet_spot
                                                            ? formatCurrency(investor.sweet_spot)
                                                            : investor.min_check_size
                                                                ? `${formatCurrency(investor.min_check_size)} - ${formatCurrency(investor.max_check_size || 0)}`
                                                                : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {investor.linkedin && (
                                                    <a
                                                        href={investor.linkedin}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-gray-500 hover:text-brand-primary flex items-center"
                                                    >
                                                        <Linkedin className="w-4 h-4 mr-1" />
                                                    </a>
                                                )}
                                                {investor.website && (
                                                    <a
                                                        href={investor.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-gray-500 hover:text-brand-primary flex items-center"
                                                    >
                                                        <Globe className="w-4 h-4 mr-1" />
                                                    </a>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleViewDetails(investor)}
                                                className="text-sm text-brand-primary hover:text-brand-dark hover:underline flex items-center font-medium transition-colors"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Details
                                            </button>
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                onClick={() => handleAddToPipeline(investor)}
                                                disabled={isAdding === investor.id}
                                                className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                                            >
                                                {isAdding === investor.id ? (
                                                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Add to Pipeline
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {recommendedData?.length === 0 && (
                                <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500">No recommendations found yet. Try completing your startup profile.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Investor Detail Modal */}
            <GlobalInvestorDetailModal
                investor={selectedInvestor}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddToPipeline={handleAddToPipeline}
                isAdding={isAdding === selectedInvestor?.id}
            />
        </div>
    );
};

export default InvestorDatabasePage;
