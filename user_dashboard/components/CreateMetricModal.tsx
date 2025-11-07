/**
 * @file CreateMetricModal.tsx
 * @description A modal component with a form for creating and logging a new product metric.
 * It includes fields for metric name, value, unit, period, and the date of recording.
 * This component is context-aware: it can be opened from a specific product page (pre-filling the product)
 * or a global page (allowing the user to select a product).
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ProductMetric, Product } from '@/types/dashboard-types';

/**
 * Props for the CreateMetricModal component.
 * @interface CreateMetricModalProps
 */
interface CreateMetricModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new metric data.
     * This defines the data contract for the backend API endpoint.
     * @param {Omit<ProductMetric, 'metric_id' | 'product_id' | 'created_at'>} metricData - The new metric data.
     * @param {number} productId - The ID of the product this metric belongs to.
     */
    onCreate: (metricData: Omit<ProductMetric, 'metric_id' | 'product_id' | 'created_at'>, productId: number) => void;
    /** An array of all products to populate the product selector when in a global context. */
    products: Product[];
    /** The ID of the currently selected product, if the modal is opened from a product-specific page. */
    productId?: number | null;
}

const CreateMetricModal: React.FC<CreateMetricModalProps> = ({ onClose, onCreate, products, productId }) => {
    // Form state
    const [metricName, setMetricName] = useState('');
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [dateRecorded, setDateRecorded] = useState(new Date().toISOString().split('T')[0]);
    // Local state for product selection, initialized by the productId prop.
    const [localProductId, setLocalProductId] = useState<string>(productId ? String(productId) : '');

    /**
     * Handles form submission.
     * Validates input, packages the form state into a data object, and calls the `onCreate` prop.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!metricName || !value || !localProductId) {
            alert("Please fill out all required fields, including selecting a product.");
            return;
        }
        onCreate({
            metric_name: metricName,
            value: parseFloat(value),
            unit,
            period,
            date_recorded: dateRecorded,
        }, parseInt(localProductId, 10));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Add New Metric</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {!productId && (
                            <div>
                                <label htmlFor="metric-product" className="block text-sm font-medium text-gray-700">Product</label>
                                <select id="metric-product" value={localProductId} onChange={e => setLocalProductId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Select a product...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label htmlFor="metric-name" className="block text-sm font-medium text-gray-700">Metric Name</label>
                            <input type="text" id="metric-name" value={metricName} onChange={e => setMetricName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="metric-value" className="block text-sm font-medium text-gray-700">Value</label>
                                <input type="number" id="metric-value" value={value} onChange={e => setValue(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label htmlFor="metric-unit" className="block text-sm font-medium text-gray-700">Unit</label>
                                <input type="text" id="metric-unit" value={unit} onChange={e => setUnit(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="e.g., %, users, $" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="metric-period" className="block text-sm font-medium text-gray-700">Period</label>
                                <select id="metric-period" value={period} onChange={e => setPeriod(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option>monthly</option>
                                    <option>weekly</option>
                                    <option>daily</option>
                                    <option>quarterly</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="metric-date-recorded" className="block text-sm font-medium text-gray-700">Date Recorded</label>
                                <input type="date" id="metric-date-recorded" value={dateRecorded} onChange={e => setDateRecorded(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Add Metric</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// FIX: Added default export to resolve import error in App.tsx.
export default CreateMetricModal;
