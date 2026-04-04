import React from 'react';
import { ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IntegrationCardProps {
    name: string;
    description: string;
    logo?: string; // URL or component
    status: 'connected' | 'disconnected' | 'coming_soon';
    onConnect?: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ name, description, status, onConnect }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-500">
                        {name.substring(0, 2).toUpperCase()}
                    </div>
                    {status === 'connected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                        </span>
                    )}
                    {status === 'coming_soon' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Coming Soon
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
                <p className="text-sm text-gray-500 mb-6">{description}</p>
            </div>

            <button
                onClick={onConnect}
                disabled={status === 'coming_soon' || status === 'connected'}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                    ${status === 'connected'
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : status === 'coming_soon'
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            >
                {status === 'connected' ? 'Manage Connection' : status === 'coming_soon' ? 'Coming Soon' : 'Connect'}
                {status !== 'coming_soon' && <ExternalLink className="w-4 h-4" />}
            </button>
        </div>
    );
};

const IntegrationSettingsPage: React.FC = () => {
    const navigate = useNavigate();

    const handleConnect = (service: string) => {
        // Placeholder for integration logic
        console.log(`Connecting to ${service}...`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
                    <p className="text-sm text-gray-500">Connect your accounting software to sync transactions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard
                    name="QuickBooks Online"
                    description="Sync customers, invoices, and expenses automatically with QuickBooks Online."
                    status="disconnected"
                    onConnect={() => handleConnect('quickbooks')}
                />
                <IntegrationCard
                    name="Zoho Books"
                    description="Seamlessly integrate your financial data with Zoho Books for unified reporting."
                    status="disconnected"
                    onConnect={() => handleConnect('zohobooks')}
                />
                <IntegrationCard
                    name="Xero"
                    description="Connect to Xero to streamline your accounting and payroll processes."
                    status="coming_soon"
                />
                <IntegrationCard
                    name="Tally Prime"
                    description="Import XML exports from Tally Prime to keep your records up to date."
                    status="disconnected" // Maybe "manual" or just disconnected if we build a connector
                    onConnect={() => handleConnect('tally')}
                />
            </div>
        </div>
    );
};

export default IntegrationSettingsPage;
