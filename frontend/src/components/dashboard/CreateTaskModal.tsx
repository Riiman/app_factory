/**
 * @file CreateTaskModal.tsx
 * @description A modal component with a form for creating a new task.
 * It includes fields for name, description, due date, status, and allows linking
 * the task to a specific scope (e.g., a Product or Funding Round).
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task, TaskStatus, Scope, LinkedEntityType } from '../types';

type LinkableItem = { id: number; name: string };

/**
 * Props for the CreateTaskModal component.
 * @interface CreateTaskModalProps
 */
interface CreateTaskModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new task data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Task, 'id' | 'startup_id' | 'created_at'>} taskData - The new task data to be sent to the backend.
     */
    onCreate: (taskData: Omit<Task, 'id' | 'startup_id' | 'created_at'>) => void;
    /** An object containing lists of items that the task can be linked to, keyed by scope. */
    linkableItems: Record<Scope, LinkableItem[]>;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onCreate, linkableItems }) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
    const [scope, setScope] = useState<Scope>(Scope.GENERAL);
    const [linkedToId, setLinkedToId] = useState<string>(''); // Use string to handle select value
    const [availableLinks, setAvailableLinks] = useState<LinkableItem[]>([]);

    /** Effect to update the available linkable items when the scope changes. */
    useEffect(() => {
        setLinkedToId(''); // Reset linked item when scope changes
        if (scope === Scope.GENERAL) {
            setAvailableLinks([]);
        } else {
            setAvailableLinks(linkableItems[scope] || []);
        }
    }, [scope, linkableItems]);

    /**
     * Handles the form submission.
     * Packages the form state into an object and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return; // Basic validation

        let linked_to_type: LinkedEntityType | undefined;
        switch (scope) {
            case Scope.PRODUCT: linked_to_type = 'Product'; break;
            case Scope.FUNDRAISING: linked_to_type = 'FundingRound'; break;
            case Scope.MARKETING: linked_to_type = 'MarketingCampaign'; break;
            default: linked_to_type = undefined;
        }

        onCreate({
            name,
            description,
            due_date: dueDate || undefined,
            status,
            scope,
            linked_to_id: linkedToId ? parseInt(linkedToId, 10) : undefined,
            linked_to_type,
        });
    };
    
    const scopeOptions = [Scope.GENERAL, Scope.PRODUCT, Scope.FUNDRAISING, Scope.MARKETING];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Task</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="task-name" className="block text-sm font-medium text-gray-700">Task Name</label>
                            <input type="text" id="task-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="task-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700">Due Date</label>
                                <input type="date" id="task-due-date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="task-status" className="block text-sm font-medium text-gray-700">Status</label>
                                <select id="task-status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="task-scope" className="block text-sm font-medium text-gray-700">Scope</label>
                                <select id="task-scope" value={scope} onChange={e => setScope(e.target.value as Scope)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {scopeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="task-linked-to" className="block text-sm font-medium text-gray-700">Link To</label>
                                <select id="task-linked-to" value={linkedToId} onChange={e => setLinkedToId(e.target.value)} disabled={scope === Scope.GENERAL} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm disabled:bg-gray-100">
                                    <option value="">{scope === Scope.GENERAL ? 'N/A' : `Select ${scope}...`}</option>
                                    {availableLinks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;