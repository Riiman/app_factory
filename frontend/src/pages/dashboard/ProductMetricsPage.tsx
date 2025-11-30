/**
 * @file ProductMetricsPage.tsx
 * @description This page provides a global, aggregated view of all product metrics
 * from all products within the startup. It presents the information in a clear,
 * sortable table for easy comparison and analysis.
 */

import React from 'react';
import { Product } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus } from 'lucide-react';

/**
 * Props for the ProductMetricsPage component.
 * @interface ProductMetricsPageProps
 */
interface ProductMetricsPageProps {
    /** An array of all product objects. The component will flatten the metrics from these products. The backend should provide a list of all products with their nested metrics. */
    products: Product[];
    /** Callback function triggered when the "Add New Metric" button is clicked. */
    onAddNewMetric: () => void;
}

const ProductMetricsPage: React.FC<ProductMetricsPageProps> = ({ products, onAddNewMetric }) => {
    // Flatten all metrics from all products and add product name for context
    const allMetrics = products.flatMap(product => 
        product.product_metrics.map(metric => ({
            ...metric,
            productName: product.name,
        }))
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Product Metrics</h1>
                <button 
                    onClick={onAddNewMetric}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Add New Metric</span>
                </button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Recorded</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {allMetrics.map((metric) => (
                                <tr key={metric.metric_id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{metric.metric_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{metric.value?.toLocaleString() ?? 'N/A'} {metric.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{metric.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(metric.date_recorded).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ProductMetricsPage;