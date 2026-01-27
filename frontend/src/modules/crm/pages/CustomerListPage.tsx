import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Users, CheckSquare, Square } from 'lucide-react';
import { crmApi } from '../api';
import { CrmContact, CrmLifecycleStage, CrmList } from '../types';
import ContactForm from '../components/ContactForm';

interface CustomerListPageProps {
    onSelectContact?: (contactId: number) => void;
}

const CustomerListPage: React.FC<CustomerListPageProps> = ({ onSelectContact }) => {
    const [contacts, setContacts] = useState<CrmContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<CrmContact | undefined>(undefined);
    const [filterStage, setFilterStage] = useState<string>('');
    const [syncing, setSyncing] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Add to List State
    const [showListModal, setShowListModal] = useState(false);
    const [availableLists, setAvailableLists] = useState<CrmList[]>([]);
    const [selectedListId, setSelectedListId] = useState<number | null>(null);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const data = await crmApi.getContacts(filterStage || undefined);
            setContacts(data);
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [filterStage]);

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedIds.length === contacts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(contacts.map(c => c.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Add to List Handlers
    const openAddToListModal = async () => {
        if (selectedIds.length === 0) return;
        try {
            const lists = await crmApi.getLists();
            setAvailableLists(lists);
            if (lists.length > 0) setSelectedListId(lists[0].id);
            setShowListModal(true);
        } catch (error) {
            alert('Failed to load lists');
        }
    };

    const handleAddToList = async () => {
        if (!selectedListId) return;
        try {
            await crmApi.addToList(selectedListId, selectedIds);
            alert(`Added ${selectedIds.length} contacts to list.`);
            setShowListModal(false);
            setSelectedIds([]); // Clear selection
        } catch (error) {
            alert('Failed to add to list');
        }
    };

    // Existing Handlers
    const handleEdit = (contact: CrmContact) => {
        setSelectedContact(contact);
        setShowModal(true);
    };

    const handleAdd = () => {
        setSelectedContact(undefined);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedContact(undefined);
    };

    const handleFormSubmit = () => {
        handleModalClose();
        fetchContacts();
    };

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Contacts & Leads</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage your people and organize them into lists.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center gap-3">
                    <select
                        value={filterStage}
                        onChange={(e) => setFilterStage(e.target.value)}
                        className="mr-3 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <option value="">All Stages</option>
                        {Object.values(CrmLifecycleStage).map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                        ))}
                    </select>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={openAddToListModal}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                        >
                            <Users className="-ml-1 mr-2 h-5 w-5" />
                            Add to List ({selectedIds.length})
                        </button>
                    )}

                    <button
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                        onClick={async () => {
                            setSyncing(true);
                            try {
                                const res = await crmApi.syncEmails();
                                alert(`Synced ${res.synced_count} new emails.`);
                                fetchContacts();
                            } catch (e) {
                                console.error(e);
                                alert("Failed to sync emails.");
                            } finally {
                                setSyncing(false);
                            }
                        }}
                        disabled={syncing}
                    >
                        <RefreshCw className={`-ml-1 mr-2 h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Emails'}
                    </button>

                    <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Add Contact
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                                            <input
                                                type="checkbox"
                                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                                                checked={contacts.length > 0 && selectedIds.length === contacts.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Title</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stage</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Edit</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                                    ) : contacts.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-4 text-gray-500">No contacts found. Add one to get started.</td></tr>
                                    ) : (
                                        contacts.map((person) => (
                                            <tr
                                                key={person.id}
                                                className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(person.id) ? 'bg-indigo-50' : ''}`}
                                                onClick={() => onSelectContact && onSelectContact(person.id)}
                                            >
                                                <td className="relative w-12 px-6 sm:w-16 sm:px-8" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                                                        checked={selectedIds.includes(person.id)}
                                                        onChange={() => toggleSelectOne(person.id)}
                                                    />
                                                </td>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0">
                                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-500">
                                                                <span className="font-medium leading-none text-white">
                                                                    {person.first_name[0]}{person.last_name ? person.last_name[0] : ''}
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="font-medium text-gray-900">{person.first_name} {person.last_name}</div>
                                                            <div className="text-gray-500">{person.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div className="text-gray-900">{person.job_title}</div>
                                                    <div className="text-gray-500">{person.company_name}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${person.lifecycle_stage === CrmLifecycleStage.CUSTOMER ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {person.lifecycle_stage}
                                                    </span>
                                                    {person.lead_status && (
                                                        <div className="text-xs text-gray-400 mt-1">{person.lead_status}</div>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.phone}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(person); }} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add To List Modal */}
            {showListModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowListModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Add to List</h3>
                                <div className="mt-4">
                                    <p className="text-sm text-gray-500 mb-4">Select a list to add {selectedIds.length} contacts to:</p>
                                    <select
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                        value={selectedListId || ''}
                                        onChange={(e) => setSelectedListId(Number(e.target.value))}
                                    >
                                        {availableLists.map(list => (
                                            <option key={list.id} value={list.id}>{list.name}</option>
                                        ))}
                                    </select>
                                    {availableLists.length === 0 && <p className="text-red-500 text-sm mt-2">No lists found. Create one first.</p>}
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={handleAddToList}
                                    disabled={availableLists.length === 0}
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowListModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Create Modal */}
            {showModal && (
                <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div>
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        {selectedContact ? 'Edit Contact' : 'Add New Contact'}
                                    </h3>
                                    <div className="mt-4">
                                        <ContactForm
                                            initialData={selectedContact || {}}
                                            onSubmit={handleFormSubmit}
                                            onCancel={handleModalClose}
                                            isLead={!selectedContact}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerListPage;
