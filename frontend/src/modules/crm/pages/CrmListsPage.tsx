import React, { useState, useEffect } from 'react';
import { crmApi } from '../api';
import { CrmList } from '../types';
import { Plus, Trash2, Users } from 'lucide-react';

const CrmListsPage: React.FC = () => {
    const [lists, setLists] = useState<CrmList[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDesc, setNewListDesc] = useState('');

    const fetchLists = async () => {
        try {
            const data = await crmApi.getLists();
            setLists(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLists();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await crmApi.createList({ name: newListName, description: newListDesc });
            setShowCreateModal(false);
            setNewListName('');
            setNewListDesc('');
            fetchLists();
        } catch (error) {
            alert('Failed to create list');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will not delete the contacts, only the list.')) return;
        try {
            await crmApi.deleteList(id);
            fetchLists();
        } catch (error) {
            alert('Failed to delete list');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Marketing Lists</h1>
                    <p className="text-sm text-gray-500">Segment your audience for campaigns.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Create List
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {lists.map((list) => (
                        <div key={list.id} className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100">
                                    <Users className="h-6 w-6 text-indigo-600" />
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <a href="#" className="focus:outline-none">
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    <p className="text-sm font-medium text-gray-900">{list.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{list.description || 'No description'}</p>
                                    <p className="text-xs text-gray-400 mt-1">{list.member_count} members</p>
                                </a>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }}
                                className="z-10 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    {lists.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            No lists found. Create one to get started.
                        </div>
                    )}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowCreateModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleCreate}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Create New List</h3>
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">List Name</label>
                                            <input
                                                type="text"
                                                id="name"
                                                required
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                value={newListName}
                                                onChange={(e) => setNewListName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="desc" className="block text-sm font-medium text-gray-700">Description</label>
                                            <textarea
                                                id="desc"
                                                rows={3}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                value={newListDesc}
                                                onChange={(e) => setNewListDesc(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Create
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrmListsPage;
