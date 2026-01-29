import React, { FC, useState, useEffect } from 'react';
import { Save, Copy } from 'lucide-react';
import Card from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import LogoUpload from '@/components/common/LogoUpload';

import { Organization } from '@/types/dashboard-types';

interface ExtendedOrganization extends Organization {
    slug?: string;
    invite_code: string;
    logo_url?: string;
}

const OrgSettingsView: FC = () => {
    const { user, refreshUser } = useAuth(); // Removed setUser
    const [organization, setOrganization] = useState<ExtendedOrganization | null>(null);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const orgId = user?.organization?.id || user?.organization_id;

    useEffect(() => {
        // Fetch fresh organization data
        const fetchOrg = async () => {
            if (!orgId) return;

            // Only set loading if we don't have data yet to prevent flash on updates
            if (!organization) setIsLoading(true);
            try {
                const response = await api.get(`/auth/organization/${orgId}/details`);
                console.log("OrgSettingsView: Fetched org details:", response);
                console.log("OrgSettingsView: logo_url:", response.organization?.logo_url);
                if (response.success) {
                    setOrganization(response.organization);
                    setName(response.organization.name);
                    setSlug(response.organization.slug || '');
                    setInviteCode(response.organization.invite_code);
                }
            } catch (error) {
                console.error("Failed to fetch organization:", error);
                // Fallback to user context if API fails or endpoint not ready
                if (user?.organization) {
                    setName(user.organization.name);
                    setSlug(user.organization.slug || '');
                    setInviteCode(user.organization.invite_code);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrg();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]); // Only re-run if orgId changes, NOT when the entire user object updates

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const orgId = user?.organization?.id || user?.organization_id;
            const response = await api.put(`/auth/organization/${orgId}`, {
                name,
                slug
            });

            if (response.success) {
                toast.success('Organization settings updated!');
                setOrganization(response.organization);
                // Optionally update context if user object stores org details deeply
                // setUser({ ...user, organization: response.organization });
            }
        } catch (error: any) {
            console.error("Failed to update organization:", error);
            toast.error(error.message || 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
                <p className="mt-1 text-sm text-gray-600">Manage your organization's profile and access.</p>
            </div>

            <Card>
                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization Logo</label>
                        <LogoUpload
                            startupId={organization?.id || 0} // Using startupId prop for orgId as the component likely handles ID
                            currentLogoUrl={organization?.logo_url}
                            size="lg"
                            uploadUrl={`/auth/organization/${organization?.id}/logo`} // Override default upload URL
                            onUploadSuccess={(url) => {
                                setOrganization(prev => prev ? { ...prev, logo_url: url } : null);
                                refreshUser();
                                toast.success("Logo uploaded successfully");
                            }}
                            onDeleteSuccess={() => {
                                setOrganization(prev => prev ? { ...prev, logo_url: undefined } : null);
                                refreshUser();
                                toast.success("Logo removed");
                            }}
                        />
                        <p className="mt-1 text-xs text-gray-500">Logo will replace the default VentureStack branding in the sidebar.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm px-4 py-2 border"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                venturestackai.com/
                            </span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)} // You might want slug validation here
                                className="flex-1 block w-full min-w-0 rounded-none rounded-r-md border-gray-300 focus:ring-brand-500 focus:border-brand-500 sm:text-sm px-4 py-2 border"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Changing this will change the login URL for all your users.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Invite Code</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                value={inviteCode}
                                readOnly
                                className="flex-1 block w-full min-w-0 rounded-l-md border-gray-300 bg-gray-50 sm:text-sm px-4 py-2 border"
                            />
                            <button
                                type="button"
                                onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success('Copied!'); }}
                                className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Share this code with users to let them join your organization.</p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default OrgSettingsView;
