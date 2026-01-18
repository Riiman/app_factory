import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MarketingSettings } from '@/types/dashboard-types';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Save, Check, AlertCircle, Linkedin, Facebook, Instagram, Mail, Lock } from 'lucide-react';
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
}> = ({ title, icon: Icon, provider, description, settings, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isActive, setIsActive] = useState(settings?.is_active || false);
    const [credentials, setCredentials] = useState<Record<string, string>>(settings?.credentials || {});

    // Helper to get fields based on provider
    const getFields = () => {
        switch (provider) {
            case 'linkedin':
                return [
                    { key: 'client_id', label: 'Client ID' },
                    { key: 'client_secret', label: 'Client Secret', type: 'password' },
                    { key: 'access_token', label: 'Access Token', type: 'password' }
                ];
            case 'facebook':
            case 'instagram':
                return [
                    { key: 'app_id', label: 'App ID' },
                    { key: 'app_secret', label: 'App Secret', type: 'password' },
                    { key: 'page_token', label: 'Page/User Access Token', type: 'password' }
                ];
            case 'email_sendgrid':
                return [
                    { key: 'api_key', label: 'API Key', type: 'password' },
                    { key: 'from_email', label: 'From Email' },
                    { key: 'from_name', label: 'From Name' }
                ];
            default:
                return [];
        }
    };

    const handleSave = async () => {
        try {
            await onSave({
                provider,
                is_active: isActive,
                credentials
            });
            setIsEditing(false);
            toast.success(`${title} settings saved!`);
        } catch (error) {
            toast.error(`Failed to save ${title} settings.`);
        }
    };

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
                <div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            disabled={!isEditing}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-3 flex-grow">
                    {getFields().map((field) => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type={field.type || 'text'}
                                    className="focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-gray-300 rounded-md"
                                    value={credentials[field.key] || ''}
                                    onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                                    placeholder={field.type === 'password' ? '••••••••' : ''}
                                />
                                {field.type === 'password' && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="pt-4 flex justify-end space-x-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-3 py-2 bg-brand-primary text-white rounded text-sm hover:bg-brand-primary/90 flex items-center"
                        >
                            <Save className="w-4 h-4 mr-1" /> Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex flex-col justify-end">
                    <div className="mt-4">
                        {isActive ? (
                            <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded">
                                <Check className="w-4 h-4 mr-2" /> Active and Configured
                            </div>
                        ) : (
                            <div className="flex items-center text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                <AlertCircle className="w-4 h-4 mr-2" /> Not Configured
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-primary bg-indigo-50 hover:bg-indigo-100"
                    >
                        Configure Settings
                    </button>
                </div>
            )}
        </Card>
    );
};

const MarketingSettingsPage: React.FC<MarketingSettingsPageProps> = ({ startupId }) => {
    const queryClient = useQueryClient();

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
        </div>
    );
};

export default MarketingSettingsPage;
