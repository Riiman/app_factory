/**
 * @file EditMetricModal.tsx
 * @description A modal component with a form for editing an existing product metric.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProductMetric } from '@/types/dashboard-types';

/**
 * Props for the EditMetricModal component.
 * @interface EditMetricModalProps
 */
interface EditMetricModalProps {
    /** The current product metric data to pre-fill the form. */
    metric: ProductMetric;
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the updated data.
     * @param {Partial<ProductMetric>} updatedMetricData - The updated product metric data.
     */
    onUpdate: (updatedMetricData: Partial<ProductMetric>) => void;
}

const FormField = ({ label, id, children }: { label: string, id: string, children: React.ReactNode }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const EditMetricModal: React.FC<EditMetricModalProps> = ({ metric, onClose, onUpdate }) => {
    // Form state, initialized with existing metric data
    const [metricName, setMetricName] = useState(metric.metric_name || '');
    const [value, setValue] = useState(metric.value?.toString() || '');
    const [targetValue, setTargetValue] = useState(metric.target_value?.toString() || '');
    const [unit, setUnit] = useState(metric.unit || '');
    const [period, setPeriod] = useState(metric.period || 'monthly');
    const [dateRecorded, setDateRecorded] = useState(metric.date_recorded || '');

    /**
     * Handles form submission.
     * Packages the form state into an object and calls the onUpdate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!metricName || !value) return;

        onUpdate({
            metric_name: metricName,
            value: parseFloat(value),
            target_value: targetValue === '' ? undefined : parseFloat(targetValue),
            unit,
            period,
            date_recorded: dateRecorded,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Edit Metric</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <FormField label="Metric Name" id="edit-metric-name">
                            <input type="text" id="edit-metric-name" value={metricName} onChange={e => setMetricName(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Value" id="edit-metric-value">
                                <input type="number" id="edit-metric-value" value={value} onChange={e => setValue(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                            <FormField label="Target Value (Optional)" id="edit-metric-target-value">
                                <input type="number" id="edit-metric-target-value" value={targetValue} onChange={e => setTargetValue(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Unit" id="edit-metric-unit">
                                <input type="text" id="edit-metric-unit" value={unit} onChange={e => setUnit(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., %, users, $" />
                            </FormField>
                             <FormField label="Period" id="edit-metric-period">
                                <select id="edit-metric-period" value={period} onChange={e => setPeriod(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                    <option>monthly</option>
                                    <option>weekly</option>
                                    <option>daily</option>
                                    <option>quarterly</option>
                                </select>
                            </FormField>
                        </div>
                        <FormField label="Date Recorded" id="edit-metric-date-recorded">
                            <input type="date" id="edit-metric-date-recorded" value={dateRecorded} onChange={e => setDateRecorded(e.target.value)} required className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMetricModal;
