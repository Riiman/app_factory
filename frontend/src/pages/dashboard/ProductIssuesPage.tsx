/**
 * @file ProductIssuesPage.tsx
 * @description This page provides a global, aggregated view of all issues and feedback
 * items from all products. It allows for easy tracking and prioritization of product
 * improvements across the entire startup.
 */

import React from 'react';
import { Product } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { Plus } from 'lucide-react';

/**
 * Props for the ProductIssuesPage component.
 * @interface ProductIssuesPageProps
 */
interface ProductIssuesPageProps {
    /** An array of all product objects. The component will flatten the issues from these products. The backend should provide a list of products with their nested issues. */
    products: Product[];
    /** Callback function triggered when the "Report New Issue" button is clicked. */
    onAddNewIssue: () => void;
}

const getSeverityColor = (severity: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch (severity) {
        case 'Critical': return 'bg-red-100 text-red-800';
        case 'High': return 'bg-orange-100 text-orange-800';
        case 'Medium': return 'bg-yellow-100 text-yellow-800';
        case 'Low':
        default: return 'bg-blue-100 text-blue-800';
    }
};

const getStatusColor = (status: 'Open' | 'In Progress' | 'Resolved') => {
    switch (status) {
        case 'Resolved': return 'bg-green-100 text-green-800';
        case 'In Progress': return 'bg-purple-100 text-purple-800';
        case 'Open':
        default: return 'bg-gray-100 text-gray-800';
    }
}

const ProductIssuesPage: React.FC<ProductIssuesPageProps> = ({ products, onAddNewIssue }) => {
    // Flatten all issues from all products and add product name for context
    const allIssues = (products || []).flatMap(product =>
        product.product_issues.map(issue => ({
            ...issue,
            productName: product.name,
        }))
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Issues & Feedback</h1>
                <button 
                    onClick={onAddNewIssue}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Report New Issue</span>
                </button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {allIssues.map((issue) => (
                                <tr key={issue.issue_id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                                        <div className="text-sm text-gray-500 truncate" style={{maxWidth: '30ch'}}>{issue.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{issue.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(issue.severity)}`}>
                                            {issue.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                                            {issue.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(issue.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ProductIssuesPage;