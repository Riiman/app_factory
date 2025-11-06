/**
 * @file CreateIssueModal.tsx
 * @description A modal component with a form for creating a new product issue or feedback item.
 * It includes fields for title, description, severity, and status.
 * This component is context-aware: it can be opened from a specific product page (pre-filling the product)
 * or a global page (allowing the user to select a product).
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ProductIssue, Product } from '../types';

type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
type Status = 'Open' | 'In Progress' | 'Resolved';

/**
 * Props for the CreateIssueModal component.
 * @interface CreateIssueModalProps
 */
interface CreateIssueModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new issue data.
     * This defines the data contract for the backend API.
     * @param {Omit<ProductIssue, 'issue_id' | 'product_id' | 'created_by' | 'created_at'>} issueData - The new issue data.
     * @param {number} productId - The ID of the product this issue belongs to.
     */
    onCreate: (issueData: Omit<ProductIssue, 'issue_id' | 'product_id' | 'created_by' | 'created_at'>, productId: number) => void;
    /** An array of all products to populate the product selector when in a global context. */
    products: Product[];
    /** The ID of the currently selected product, if the modal is opened from a product-specific page. */
    productId?: number | null;
}

const CreateIssueModal: React.FC<CreateIssueModalProps> = ({ onClose, onCreate, products, productId }) => {
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<Severity>('Medium');
    const [status, setStatus] = useState<Status>('Open');
    // Local state for product selection, initialized by the productId prop.
    const [localProductId, setLocalProductId] = useState<string>(productId ? String(productId) : '');

    /**
     * Handles form submission.
     * Validates input, packages the form state into a data object, and calls the `onCreate` prop.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !localProductId) {
             alert("Please fill out all required fields, including selecting a product.");
             return;
        }
        onCreate({
            title,
            description,
            severity,
            status,
        }, parseInt(localProductId, 10));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Report New Issue</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Conditionally render the product selector if no specific product ID is passed */}
                        {!productId && (
                            <div>
                                <label htmlFor="issue-product" className="block text-sm font-medium text-gray-700">Product</label>
                                <select id="issue-product" value={localProductId} onChange={e => setLocalProductId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Select a product...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label htmlFor="issue-title" className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" id="issue-title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="issue-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="issue-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="issue-severity" className="block text-sm font-medium text-gray-700">Severity</label>
                                <select id="issue-severity" value={severity} onChange={e => setSeverity(e.target.value as Severity)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                    <option>Critical</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="issue-status" className="block text-sm font-medium text-gray-700">Status</label>
                                <select id="issue-status" value={status} onChange={e => setStatus(e.target.value as Status)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option>Open</option>
                                    <option>In Progress</option>
                                    <option>Resolved</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Report Issue</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateIssueModal;