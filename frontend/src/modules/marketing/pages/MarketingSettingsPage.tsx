import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MarketingSettings } from '@/types/dashboard-types';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Save, Check, AlertCircle, Linkedin, Facebook, Instagram, Mail, Lock, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface MarketingSettingsPageProps {
    startupId: number;
}

const IntegrationCard: React.FC<{
    title: string;
    icon: React.ElementType;
    provider: string;
    description: string;
    settings?: MarketingSettings;
    onSave: (data: any) => Promise<void>;
    startupId?: number; // Added startupId prop
}> = ({ title, icon: Icon, provider, description, settings, onSave, startupId }) => {
    // isActive is derived from settings, but we track it locally for optimistic updates if needed
    const isActive = settings?.is_active || false;
    const credentials = settings?.credentials || {};

    const handleConnect = async () => {
        if (!startupId) return;
        try {
            // Initiate Auth via GetLate
            const authUrl = await api.initiateGetLateAuth(startupId, provider);
            window.location.href = authUrl;
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || `Failed to initiate ${title} connection`);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(`Are you sure you want to disconnect ${title}? This will stop automated posting.`)) return;
        try {
            await onSave({
                provider,
                is_active: false,
                credentials: {} // Clear credentials on disconnect
            });
            toast.success(`Disconnected ${title}.`);
        } catch (error) {
            toast.error(`Failed to disconnect ${title}.`);
        }
    }

    return (
        <Card className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>
                {/* Toggle Removed from here */}
            </div>

            <div className="flex-grow flex flex-col justify-center items-center py-4">
                {isActive ? (
                    <div className="w-full text-center">
                        <div className="inline-flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-full mb-3">
                            <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-900">Active & Connected</h4>
                        <p className="text-xs text-gray-500 mt-1 mb-4">
                            {credentials?.provider_entity_name ? `Connected to: ${credentials.provider_entity_name}` : 'Ready to post'}
                        </p>

                        <div className="flex flex-col space-y-2">
                            <button
                                onClick={handleConnect}
                                className="text-sm text-brand-primary hover:text-brand-primary/80 underline"
                            >
                                Reconnect / Switch Page
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center justify-center"
                            >
                                <Trash2 className="w-3 h-3 mr-1" /> Disconnect
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full text-center">
                        <p className="text-sm text-gray-500 mb-4 px-4">
                            Connect your {title} account to authorize posting.
                        </p>
                        <button
                            onClick={handleConnect}
                            className="inline-flex items-center px-4 py-2 bg-[#0077b5] text-white rounded shadow hover:bg-[#006097]"
                        >
                            <Icon className="w-4 h-4 mr-2" /> Connect {title}
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
};

const MarketingSettingsPage: React.FC<MarketingSettingsPageProps> = ({ startupId }) => {
    const queryClient = useQueryClient();

    // Selection Modal State
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectionOptions, setSelectionOptions] = useState<any[]>([]);
    const [currentProvider, setCurrentProvider] = useState<string>('');
    const [connectToken, setConnectToken] = useState<string>('');
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [isFinalizing, setIsFinalizing] = useState(false);
    // New state for personal/meta data
    const [userProfileStr, setUserProfileStr] = useState<string>('');
    const [profileIdStr, setProfileIdStr] = useState<string>('');
    const [refreshToken, setRefreshToken] = useState<string>('');

    // Check for status query params (from OAuth redirect)
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const message = params.get('message');
        const provider = params.get('provider');
        const token = params.get('connect_token');
        let orgIds = params.get('orgIds');
        const organizationsStr = params.get('organizations');
        const userProfile = params.get('userProfile');
        const profileId = params.get('profileId');
        const refreshTokenParam = params.get('refreshToken');

        if (status === 'success') {
            toast.success('Connection successful!');
            window.history.replaceState({}, '', window.location.pathname);
        } else if (status === 'error') {
            toast.error(message?.replace(/\+/g, ' ') || 'Connection failed.');
            window.history.replaceState({}, '', window.location.pathname);
        } else if (status === 'requires_selection' && provider && token) {
            // Trigger selection flow
            setCurrentProvider(provider);
            setConnectToken(token);
            if (userProfile) setUserProfileStr(userProfile);
            if (profileId) setProfileIdStr(profileId);
            if (refreshTokenParam) setRefreshToken(refreshTokenParam);

            // Try to extract orgIds from organizations param if orgIds is missing
            let parsedOrgs = [];
            if (!orgIds && organizationsStr) {
                try {
                    // Handle double encoding if necessary
                    let cleanStr = organizationsStr;
                    if (cleanStr.startsWith('%')) {
                        cleanStr = decodeURIComponent(cleanStr);
                    }
                    if (cleanStr.startsWith('%')) { // Check again just in case
                        cleanStr = decodeURIComponent(cleanStr);
                    }

                    parsedOrgs = JSON.parse(cleanStr);
                    if (Array.isArray(parsedOrgs)) {
                        orgIds = parsedOrgs.map((o: any) => o.id).join(',');
                    }
                } catch (e) { console.error("Failed to parse organizations", e); }
            }

            toast.loading('Fetching accounts...');

            // Pass orgIds to API (and raw organizations string as fallback)
            api.listEntities(startupId, provider, token, orgIds || undefined, organizationsStr || undefined)
                .then((data: any) => {
                    toast.dismiss();
                    if (provider === 'linkedin') {
                        let list = data.organizations || data.elements || data;

                        // Merge/Enrich with parsedOrgs (which we know has names from the redirect)
                        if (parsedOrgs.length > 0 && Array.isArray(list)) {
                            list = list.map((item: any) => {
                                const fallback = parsedOrgs.find((p: any) => (p.id == item.id) || (p.urn == item.urn));
                                if (fallback) {
                                    return {
                                        ...item,
                                        name: item.name || fallback.name,
                                        vanityName: item.vanityName || fallback.vanityName,
                                        localizedName: item.localizedName || fallback.localizedName
                                    };
                                }
                                return item;
                            });
                        }

                        setSelectionOptions(list);
                    } else {
                        setSelectionOptions(data.data || data);
                    }
                    setShowSelectionModal(true);
                    window.history.replaceState({}, '', window.location.pathname);
                })
                .catch((err: any) => {
                    console.error(err);
                    // Fallback to parsed orgs if API fails but we have data from redirect
                    if (parsedOrgs.length > 0) {
                        toast.dismiss();
                        setSelectionOptions(parsedOrgs);
                        setShowSelectionModal(true);
                        window.history.replaceState({}, '', window.location.pathname);
                        return;
                    }

                    toast.dismiss();
                    toast.error("Failed to fetch account list.");
                });
        }
    }, [startupId]);

    const handleFinalize = async () => {
        if (!selectedEntityId) return;
        setIsFinalizing(true);
        try {
            // find name
            const selectedOpt = selectionOptions.find((o: any) => {
                const id = o.urn || o.id;
                return id === selectedEntityId;
            });

            // Parse userProfile if available
            let userProfileObj = null;
            if (userProfileStr) {
                try {
                    let cleanStr = userProfileStr;
                    if (cleanStr.startsWith('%')) cleanStr = decodeURIComponent(cleanStr);
                    if (cleanStr.startsWith('%')) cleanStr = decodeURIComponent(cleanStr);
                    userProfileObj = JSON.parse(cleanStr);
                } catch (e) { console.error("Failed to parse userProfile", e); }
            }

            await api.finalizeConnection(
                startupId,
                currentProvider,
                connectToken,
                selectedEntityId,
                selectedOpt?.name || selectedOpt?.localizedName || 'Unknown',
                userProfileObj,
                profileIdStr,
                refreshToken
            );

            toast.success(`${currentProvider} connected successfully!`);
            setShowSelectionModal(false);
            queryClient.invalidateQueries({ queryKey: ['marketingSettings', startupId] });

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to finalize connection.");
        } finally {
            setIsFinalizing(false);
        }
    };

    const { data: settingsList, isLoading } = useQuery({
        queryKey: ['marketingSettings', startupId],
        queryFn: () => api.getMarketingSettings(startupId),
        enabled: !!startupId
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.updateMarketingSettings(startupId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketingSettings', startupId] });
        }
    });

    const getSetting = (provider: string) => settingsList?.find((s: MarketingSettings) => s.provider === provider);

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Marketing Integration Settings</h1>
            <p className="text-gray-500">Configure your external accounts to enable automated posting and analytics.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard
                    title="LinkedIn"
                    icon={Linkedin}
                    provider="linkedin"
                    description="Connect your LinkedIn Company Page for automated updates."
                    settings={getSetting('linkedin')}
                    onSave={mutation.mutateAsync}
                    startupId={startupId}
                />
                <IntegrationCard
                    title="Facebook / Meta"
                    icon={Facebook}
                    provider="facebook"
                    description="Connect your Facebook Page for posting and ads."
                    settings={getSetting('facebook')}
                    onSave={mutation.mutateAsync}
                />
                <IntegrationCard
                    title="Instagram"
                    icon={Instagram}
                    provider="instagram"
                    description="Connect your Instagram Business account."
                    settings={getSetting('instagram')}
                    onSave={mutation.mutateAsync}
                />
                <IntegrationCard
                    title="SendGrid Email"
                    icon={Mail}
                    provider="email_sendgrid"
                    description="Configure transactional and marketing emails via SendGrid."
                    settings={getSetting('email_sendgrid')}
                    onSave={mutation.mutateAsync}
                />
            </div>

            {/* Selection Modal */}
            {showSelectionModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Select Account</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500 mb-3">
                                    Please select the page or account you want to connect:
                                </p>
                                <select
                                    className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    value={selectedEntityId}
                                    onChange={(e) => setSelectedEntityId(e.target.value)}
                                >
                                    <option value="">-- Select --</option>
                                    <option value="personal">Post as yourself</option>
                                    {selectionOptions.map((opt: any) => (
                                        <option key={opt.urn || opt.id} value={opt.urn || opt.id}>
                                            {opt.name || opt.localizedName || opt.vanityName || opt.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="items-center px-4 py-3">
                                <button
                                    id="ok-btn"
                                    className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                                    onClick={handleFinalize}
                                    disabled={!selectedEntityId || isFinalizing}
                                >
                                    {isFinalizing ? 'Connecting...' : 'Confirm Selection'}
                                </button>
                                <button
                                    className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    onClick={() => setShowSelectionModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingSettingsPage;
