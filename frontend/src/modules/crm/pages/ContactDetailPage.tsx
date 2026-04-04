import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { CrmContact, CrmDeal, CrmInteraction, InteractionType } from '../types';
import { User, Phone, Mail, Calendar, Clock, DollarSign, Plus, Sparkles } from 'lucide-react';

interface ContactDetailPageProps {
    contactId: number;
    onBack: () => void;
}

const ContactDetailPage: React.FC<ContactDetailPageProps> = ({ contactId, onBack }) => {
    const [contact, setContact] = useState<CrmContact | null>(null);
    const [interactions, setInteractions] = useState<CrmInteraction[]>([]);
    const [deals, setDeals] = useState<CrmDeal[]>([]); // In a real app we'd filter deals by contact on backend or fetch specific endpoint
    const [loading, setLoading] = useState(true);

    // Interaction Form State
    const [noteContent, setNoteContent] = useState('');
    const [interactionType, setInteractionType] = useState<InteractionType>(InteractionType.NOTE);
    const [filter, setFilter] = useState<'All' | 'Sales' | 'Marketing' | 'Notes'>('All');

    const filteredInteractions = interactions.filter(i => {
        if (filter === 'All') return true;

        const type = i.type;
        const content = i.content || '';

        if (filter === 'Notes') return type === InteractionType.NOTE;

        if (filter === 'Sales') {
            // Includes Calls, Meetings, and AI-tagged Opportunities
            return type === InteractionType.CALL || type === InteractionType.MEETING || content.includes('[AI: Opportunity');
        }

        if (filter === 'Marketing') {
            // Includes AI-tagged Marketing content
            return content.includes('[AI: Newsletter') || content.includes('Marketing');
        }

        return true;
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const contactData = await crmApi.getContact(contactId);
            setContact(contactData);

            const interactionsData = await crmApi.getInteractions(contactId);
            // Sort interactions by date desc
            setInteractions(interactionsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            // Fetch all deals and filter (temporary inefficient solution until backend supports filtering deals by contact)
            const allDeals = await crmApi.getDeals();
            setDeals(allDeals.filter(d => d.contact_id === contactId));

        } catch (error) {
            console.error("Failed to load contact details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contactId) {
            loadData();
        }
    }, [contactId]);

    const handleAddInteraction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await crmApi.createInteraction(contactId, {
                type: interactionType,
                content: noteContent
            });
            setNoteContent('');
            loadData(); // Refresh timeline
        } catch (error) {
            console.error("Failed to add interaction", error);
        }
    };

    const handleEnrich = async () => {
        if (!contact?.email) return;
        const domain = contact.email.split('@')[1];
        if (!domain) return;

        try {
            const enriched = await crmApi.enrichCompany(domain);
            alert(`Found company info for ${enriched.name}!`);

            if (contact.company_id) {
                await crmApi.updateCompany(contact.company_id, {
                    industry: enriched.industry,
                    about_us: enriched.description
                });
                alert("Company record updated.");
                loadData();
            }
        } catch (e) {
            console.error(e);
            alert("Failed to enrich company.");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!contact) return <div className="p-6">Contact not found</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 text-gray-500 hover:text-gray-700 font-medium">
                        &larr; Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            {contact.first_name} {contact.last_name}
                            <span className="ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                {contact.lifecycle_stage}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {contact.job_title} at <span className="font-medium text-gray-900">{contact.company_name}</span> &bull; {contact.email} &bull; {contact.phone}
                        </p>
                    </div>
                    {contact.email && contact.company_id && (
                        <button
                            onClick={handleEnrich}
                            className="ml-4 p-1.5 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors"
                            title="Smart Enrich Company Info"
                        >
                            <Sparkles className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <div>
                    {/* Actions like Edit Profile could go here */}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Timeline */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Activity Timeline</h2>
                        <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-lg">
                            {['All', 'Sales', 'Marketing', 'Notes'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Note/Activity Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <form onSubmit={handleAddInteraction}>
                            <div className="flex space-x-4 mb-3">
                                <button type="button" onClick={() => setInteractionType(InteractionType.NOTE)} className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded ${interactionType === InteractionType.NOTE ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border'}`}>Note</button>
                                <button type="button" onClick={() => setInteractionType(InteractionType.CALL)} className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded ${interactionType === InteractionType.CALL ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border'}`}>Call</button>
                                <button type="button" onClick={() => setInteractionType(InteractionType.MEETING)} className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded ${interactionType === InteractionType.MEETING ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border'}`}>Meeting</button>
                            </div>
                            <textarea
                                className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                rows={3}
                                placeholder="Log a note, call, or meeting detail..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                required
                            />
                            <div className="flex justify-end mt-2">
                                <button type="submit" className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none">
                                    Log Activity
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Timeline Stream */}
                    <ul className="space-y-6">
                        {filteredInteractions.length === 0 ? (
                            <li className="text-center text-sm text-gray-500 py-8">No activities found for this filter.</li>
                        ) : (
                            filteredInteractions.map((interaction) => (
                                <li key={interaction.id} className="relative flex gap-x-4">
                                    <div className="absolute left-0 top-0 flex w-6 justify-center -bottom-6">
                                        <div className="w-px bg-gray-200"></div>
                                    </div>
                                    <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
                                        {interaction.type === InteractionType.CALL && <Phone className="h-4 w-4 text-green-500" />}
                                        {interaction.type === InteractionType.EMAIL && <Mail className="h-4 w-4 text-blue-500" />}
                                        {interaction.type === InteractionType.MEETING && <User className="h-4 w-4 text-purple-500" />}
                                        {interaction.type === InteractionType.NOTE && <Clock className="h-4 w-4 text-gray-500" />}
                                    </div>
                                    <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200">
                                        <div className="flex justify-between gap-x-4">
                                            <div className="py-0.5 text-xs leading-5 text-gray-500">
                                                <span className="font-medium text-gray-900">{interaction.creator_name || 'User'}</span> logged a {interaction.type.toLowerCase()}
                                            </div>
                                            <time dateTime={interaction.created_at} className="flex-none py-0.5 text-xs leading-5 text-gray-500">
                                                {new Date(interaction.created_at).toLocaleString()}
                                            </time>
                                        </div>
                                        <p className="text-sm leading-6 text-gray-500 py-1 whitespace-pre-wrap">{interaction.content}</p>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Right: Deals & Associations */}
                <div className="w-80 bg-gray-50 p-6 border-l border-gray-200 overflow-y-auto">
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Deals</h2>
                            {/* In a real implementation this would invoke the Create Deal Modal pre-filled */}
                        </div>
                        {deals.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No active deals.</p>
                        ) : (
                            <ul className="space-y-3">
                                {deals.map(deal => (
                                    <li key={deal.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                        <div className="font-medium text-indigo-600 text-sm hover:underline cursor-pointer">{deal.name}</div>
                                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                                            <span>{deal.stage.replace(/_/g, ' ')}</span>
                                            <span className="font-semibold text-gray-900">${deal.amount.toLocaleString()}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {/* Placeholder for Add Deal Action */}
                        <button className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <Plus className="mr-2 h-4 w-4" /> Add Deal
                        </button>
                    </div>

                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-gray-500">Lead Status</dt>
                                <dd className="font-medium text-gray-900">{contact.lead_status}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-500">Created</dt>
                                <dd className="font-medium text-gray-900">{new Date(contact.created_at).toLocaleDateString()}</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ContactDetailPage;
