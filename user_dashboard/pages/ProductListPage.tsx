/**
 * @file ProductListPage.tsx
 * @description This page displays a list of all products associated with the startup.
 * Each product is shown in a card format, which is clickable to navigate to the
 * product's detail page. It also includes a button to add a new product.
 */

import React from 'react';
import { Product } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus } from 'lucide-react';

/**
 * Props for the ProductListPage component.
 * @interface ProductListPageProps
 */
interface ProductListPageProps {
    /** An array of all product objects to be displayed. The backend should provide an array of objects conforming to the `Product` interface. */
    products: Product[];
    /** Callback function triggered when a product card is clicked. Navigates to the detail view. */
    onSelectProduct: (productId: number) => void;
    /** Callback function triggered when the "Add New Product" button is clicked. Opens the creation modal. */
    onAddNewProduct: () => void;
}

const getStageColor = (stage: string) => {
    switch (stage) {
        case 'LAUNCHED': return 'bg-green-100 text-green-800';
        case 'BETA': return 'bg-yellow-100 text-yellow-800';
        case 'DEVELOPMENT': return 'bg-blue-100 text-blue-800';
        case 'CONCEPT':
        default: return 'bg-gray-100 text-gray-800';
    }
}

const ProductListPage: React.FC<ProductListPageProps> = ({ products, onSelectProduct, onAddNewProduct }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <button 
                    onClick={onAddNewProduct}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add New Product</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                    <div key={product.id} onClick={() => onSelectProduct(product.id)} className="cursor-pointer">
                        <Card>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                                    <p className="text-sm text-gray-500">Version {product.version}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(product.stage)}`}>
                                    {product.stage}
                                </span>
                            </div>
                            <p className="mt-3 text-sm text-gray-600 line-clamp-2">{product.description}</p>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductListPage;