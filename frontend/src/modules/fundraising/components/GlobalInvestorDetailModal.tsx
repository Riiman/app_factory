import React from 'react';
import { X, Linkedin, Globe, MapPin, DollarSign, Briefcase, TrendingUp, User, Building2 } from 'lucide-react';
import { GlobalInvestor } from '@/types/dashboard-types';
import { formatCurrency } from '@/utils/formatters';

interface GlobalInvestorDetailModalProps {
    investor: GlobalInvestor | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToPipeline: (investor: GlobalInvestor) => void;
    isAdding?: boolean;
}

const GlobalInvestorDetailModal: React.FC<GlobalInvestorDetailModalProps> = ({
    investor,
    isOpen,
    onClose,
    onAddToPipeline,
    isAdding = false
}) => {
    if (!isOpen || !investor) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

                {/* Modal */}
                <div
                    className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
                        <div className="flex items-start space-x-4 flex-1">
                            {investor.logo_url ? (
                                <img
                                    src={investor.logo_url}
                                    alt=""
                                    className="h-16 w-16 rounded-full object-contain bg-gray-50 p-2 flex-shrink-0"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-bold text-2xl flex-shrink-0">
                                    {investor.name[0]}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold text-gray-900 truncate">{investor.name}</h2>
                                {investor.title && (
                                    <p className="text-lg text-gray-600">{investor.title}</p>
                                )}
                                {investor.firm_name && (
                                    <div className="flex items-center text-gray-500 mt-1">
                                        <Building2 className="w-4 h-4 mr-1" />
                                        <span>{investor.firm_name}</span>
                                    </div>
                                )}

                                {/* Contact Buttons */}
                                <div className="flex gap-2 mt-3">
                                    {investor.linkedin && (
                                        <a
                                            href={investor.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Linkedin className="w-4 h-4 mr-1.5" />
                                            LinkedIn
                                        </a>
                                    )}
                                    {investor.website && (
                                        <a
                                            href={investor.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Globe className="w-4 h-4 mr-1.5" />
                                            Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="ml-4 text-gray-400 hover:text-gray-500 flex-shrink-0"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-6 space-y-6">
                        {/* Investment Focus */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                <Briefcase className="w-5 h-5 mr-2 text-brand-primary" />
                                Investment Focus
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Sectors */}
                                {investor.focus_sectors && investor.focus_sectors.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Sectors</p>
                                        <div className="flex flex-wrap gap-2">
                                            {investor.focus_sectors.map((sector, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {sector}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stages */}
                                {investor.focus_stages && investor.focus_stages.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Stages</p>
                                        <div className="flex flex-wrap gap-2">
                                            {investor.focus_stages
                                                .filter(stage => !stage.includes('Other Lists'))
                                                .map((stage, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                                    >
                                                        {stage}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Locations */}
                            {investor.locations && investor.locations.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        Locations
                                    </p>
                                    <p className="text-sm text-gray-600">{investor.locations.join(', ')}</p>
                                </div>
                            )}
                        </div>

                        {/* Check Size Details */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                <DollarSign className="w-5 h-5 mr-2 text-brand-primary" />
                                Check Size
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {investor.sweet_spot && (
                                    <div>
                                        <p className="text-sm text-gray-500">Sweet Spot</p>
                                        <p className="text-xl font-bold text-brand-primary">
                                            {formatCurrency(investor.sweet_spot)}
                                        </p>
                                    </div>
                                )}
                                {investor.min_check_size && (
                                    <div>
                                        <p className="text-sm text-gray-500">Minimum</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(investor.min_check_size)}
                                        </p>
                                    </div>
                                )}
                                {investor.max_check_size && (
                                    <div>
                                        <p className="text-sm text-gray-500">Maximum</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(investor.max_check_size)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Investments */}
                        {investor.recent_investments && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                    <TrendingUp className="w-5 h-5 mr-2 text-brand-primary" />
                                    Recent Investments
                                </h3>
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {investor.recent_investments}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Bio */}
                        {investor.bio && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                    <User className="w-5 h-5 mr-2 text-brand-primary" />
                                    About
                                </h3>
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {investor.bio}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => onAddToPipeline(investor)}
                            disabled={isAdding}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                        >
                            {isAdding ? (
                                <div className="flex items-center">
                                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2"></div>
                                    Adding...
                                </div>
                            ) : (
                                'Add to Pipeline'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalInvestorDetailModal;
