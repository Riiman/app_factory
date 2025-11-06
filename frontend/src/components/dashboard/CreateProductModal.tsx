/**
 * @file CreateProductModal.tsx
 * @description A modal component with a form for creating a new product.
 * It includes fields for all essential product details like name, description, stage, etc.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Product, ProductStage } from '../types';

/**
 * Props for the CreateProductModal component.
 * @interface CreateProductModalProps
 */
interface CreateProductModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /**
     * Callback function triggered on form submission with the new product data.
     * This defines the "contract" for what data the backend API should expect.
     * @param {Omit<Product, 'id' | 'startup_id' | 'tech_stack' | 'features' | 'metrics' | 'issues' | 'business_details'>} productData - The new product data for the backend.
     */
    onCreate: (productData: Omit<Product, 'id' | 'startup_id' | 'tech_stack' | 'features' | 'metrics' | 'issues' | 'business_details'>) => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({ onClose, onCreate }) => {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [version, setVersion] = useState('0.1.0');
    const [stage, setStage] = useState<ProductStage>(ProductStage.CONCEPT);
    const [customerSegment, setCustomerSegment] = useState('');
    const [uniqueValueProp, setUniqueValueProp] = useState('');
    const [targetedLaunchDate, setTargetedLaunchDate] = useState('');

    /**
     * Handles form submission, packages the data, and calls the onCreate prop.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        onCreate({
            name,
            description,
            stage,
            version,
            targeted_launch_date: targetedLaunchDate,
            customer_segment: customerSegment,
            unique_value_prop: uniqueValueProp,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Product</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="product-name" className="block text-sm font-medium text-gray-700">Product Name</label>
                            <input type="text" id="product-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="product-description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea id="product-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"></textarea>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="product-version" className="block text-sm font-medium text-gray-700">Version</label>
                                <input type="text" id="product-version" value={version} onChange={e => setVersion(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="product-stage" className="block text-sm font-medium text-gray-700">Stage</label>
                                <select id="product-stage" value={stage} onChange={e => setStage(e.target.value as ProductStage)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                    {Object.values(ProductStage).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="product-customer-segment" className="block text-sm font-medium text-gray-700">Customer Segment</label>
                            <input type="text" id="product-customer-segment" value={customerSegment} onChange={e => setCustomerSegment(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                         <div>
                            <label htmlFor="product-uvp" className="block text-sm font-medium text-gray-700">Unique Value Proposition</label>
                            <input type="text" id="product-uvp" value={uniqueValueProp} onChange={e => setUniqueValueProp(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                         <div>
                            <label htmlFor="product-launch-date" className="block text-sm font-medium text-gray-700">Targeted Launch Date</label>
                            <input type="date" id="product-launch-date" value={targetedLaunchDate} onChange={e => setTargetedLaunchDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                    </div>
                    <div className="border-t p-4 bg-gray-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90">Create Product</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProductModal;