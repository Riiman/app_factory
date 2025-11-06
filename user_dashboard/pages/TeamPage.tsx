/**
 * @file TeamPage.tsx
 * @description A page component that displays the startup's founding team members.
 * It shows each founder in a card with their role and contact information.
 */

import React from 'react';
import { Founder } from '../types';
import Card from '../components/Card';
import { Plus, Edit, Trash2, Mail, Phone, Linkedin } from 'lucide-react';

/**
 * Props for the TeamPage component.
 * @interface TeamPageProps
 */
interface TeamPageProps {
    /** An array of founder objects to be displayed. The backend should provide an array of `Founder` objects. */
    founders: Founder[];
    /** Callback function triggered when the "Add Founder" button is clicked. */
    onAddNewFounder: () => void;
}

const TeamPage: React.FC<TeamPageProps> = ({ founders, onAddNewFounder }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Team</h1>
                <button 
                    onClick={onAddNewFounder}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add Founder</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {founders.map(founder => (
                    <Card key={founder.id} className="flex flex-col">
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{founder.name}</h3>
                                    <p className="text-brand-secondary font-medium">{founder.role}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-3 border-t pt-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Mail size={16} className="mr-3 text-gray-400" />
                                    <a href={`mailto:${founder.email}`} className="hover:text-brand-primary">{founder.email}</a>
                                </div>
                                {founder.phone_number && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Phone size={16} className="mr-3 text-gray-400" />
                                        <span>{founder.phone_number}</span>
                                    </div>
                                )}
                                {founder.linkedin_link && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Linkedin size={16} className="mr-3 text-gray-400" />
                                        <a href={founder.linkedin_link} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary">LinkedIn Profile</a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border-t mt-4 pt-4 flex justify-end space-x-2">
                            <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md">
                                <Edit size={18} />
                            </button>
                            <button className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TeamPage;