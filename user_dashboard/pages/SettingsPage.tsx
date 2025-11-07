/**
 * @file SettingsPage.tsx
 * @description This page component provides an interface for users to manage their
 * startup's high-level settings. It includes sections for general information
 * and sensitive, potentially destructive actions.
 */

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import { Save, AlertTriangle } from 'lucide-react';

/**
 * Props for the SettingsPage component.
 * @interface SettingsPageProps
 */
interface SettingsPageProps {
    /** The current name of the startup. */
    startupName: string;
    /** The current URL slug for the startup. */
    startupSlug: string;
    /** The current next milestone for the startup. */
    nextMilestone: string;
    /**
     * Callback function to save the updated settings.
     * @param {object} settings - An object containing the new settings.
     * @param {string} settings.name - The updated startup name.
     * @param {string} settings.slug - The updated startup slug.
     * @param {string} settings.next_milestone - The updated next milestone.
     */
    onSave: (settings: { name: string; slug: string; next_milestone: string }) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ startupName, startupSlug, nextMilestone, onSave }) => {
    // Form state, initialized with props
    const [name, setName] = useState(startupName);
    const [slug, setSlug] = useState(startupSlug);
    const [milestone, setMilestone] = useState(nextMilestone);

    /**
     * Effect to sync the component's internal state if the props change from the parent.
     * This is useful if the data can be updated from another part of the app.
     */
    useEffect(() => {
        setName(startupName);
        setSlug(startupSlug);
        setMilestone(nextMilestone);
    }, [startupName, startupSlug, nextMilestone]);

    /**
     * Handles the form submission for updating settings.
     * It calls the `onSave` prop with the current form state.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, slug, next_milestone: milestone });
        alert('Settings saved!'); // Placeholder for a proper notification
    };
    
    /** Placeholder function for deactivating the startup. */
    const handleDeactivate = () => {
        if (window.confirm('Are you sure you want to deactivate this startup? This action can be undone.')) {
            alert('Startup deactivated. (This is a placeholder action)');
        }
    };

    /** Placeholder function for deleting the startup. */
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to permanently delete this startup? This action CANNOT be undone.')) {
            alert('Startup deleted permanently. (This is a placeholder action)');
        }
    };


    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-600">Manage your startup's core information and settings.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="startup-name" className="block text-sm font-medium text-gray-700">Startup Name</label>
                            <input type="text" id="startup-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="startup-slug" className="block text-sm font-medium text-gray-700">URL Slug</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                    startupos.com/
                                </span>
                                <input type="text" id="startup-slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 block w-full min-w-0 rounded-none rounded-r-md border-gray-300 sm:text-sm" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="next-milestone" className="block text-sm font-medium text-gray-700">Next Milestone</label>
                            <input type="text" id="next-milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-3 text-right rounded-b-lg">
                        <button type="submit" className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 text-sm font-medium">
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="border-red-500">
                <div className="p-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                             <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-red-800">Danger Zone</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>These actions are destructive and cannot be easily undone. Please be certain.</p>
                            </div>
                        </div>
                    </div>
                     <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
                        <button 
                            onClick={handleDeactivate}
                            type="button" 
                            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-500 text-white font-medium hover:bg-yellow-600 sm:text-sm">
                            Deactivate Startup
                        </button>
                        <button 
                            onClick={handleDelete}
                            type="button" 
                            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 sm:text-sm">
                            Delete Startup Permanently
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SettingsPage;