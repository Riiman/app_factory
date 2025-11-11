/**
 * @file ProductDetailPage.tsx
 * @description A detailed view for a single product. It uses a tabbed interface
 * to display different aspects of the product, such as its features, metrics, issues,
 * business details, and other linked operational items (tasks, experiments, artifacts).
 */

import React, { useState } from 'react';
import { Product, Task, Experiment, Artifact } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { ArrowLeft, Plus, Edit } from 'lucide-react';

/**
 * Props for the ProductDetailPage component.
 * @interface ProductDetailPageProps
 */
interface ProductDetailPageProps {
    /** The full product object to be displayed. The backend should provide a complete `Product` object including its nested arrays (features, metrics, issues). */
    product: Product;
    /** An array of tasks linked to this product. This could be fetched with the product data or as a separate API call. */
    linkedTasks: Task[];
    /** An array of experiments linked to this product. */
    linkedExperiments: Experiment[];
    /** An array of artifacts linked to this product. */
    linkedArtifacts: Artifact[];
    /** Callback function to navigate back to the product list page. */
    onBack: () => void;
    /** Callback function to open the "Create Feature" modal. */
    onAddFeature: () => void;
    /** Callback function to open the "Create Metric" modal. */
    onAddMetric: () => void;
    /** Callback function to open the "Create Issue" modal. */
    onAddIssue: () => void;
}

type Tab = 'Features' | 'Metrics' | 'Issues' | 'Business Details' | 'Linked Items';

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ 
    product, 
    linkedTasks, 
    linkedExperiments, 
    linkedArtifacts, 
    onBack,
    onAddFeature,
    onAddMetric,
    onAddIssue
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('Features');
    
    const tabs: Tab[] = ['Features', 'Metrics', 'Issues', 'Business Details', 'Linked Items'];

    const renderTabContent = () => {
        switch(activeTab) {
            case 'Features':
                return (
                    <Card title="Features" actions={<button onClick={onAddFeature} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1"/> Add Feature</button>}>
                        <ul className="divide-y divide-gray-200">
                           {product.features.map(feature => (
                               <li key={feature.id} className="py-4">
                                   <h4 className="font-semibold text-gray-800">{feature.name}</h4>
                                   <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                               </li>
                           ))}
                        </ul>
                    </Card>
                );
            case 'Metrics':
                 return (
                    <Card title="Metrics" actions={<button onClick={onAddMetric} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1"/> Add Metric</button>}>
                       <div className="grid grid-cols-2 gap-4">
                        {product.metrics.map(metric => (
                            <div key={metric.metric_id} className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">{metric.metric_name}</p>
                                <p className="text-2xl font-bold text-gray-900">{metric.value.toLocaleString()} <span className="text-base font-normal text-gray-600">{metric.unit}</span></p>
                            </div>
                        ))}
                       </div>
                    </Card>
                );
            case 'Issues':
                return (
                     <Card title="Issues & Feedback" actions={<button onClick={onAddIssue} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1"/> Report Issue</button>}>
                        <ul className="divide-y divide-gray-200">
                           {product.issues.map(issue => (
                               <li key={issue.issue_id} className="py-4">
                                   <div className="flex justify-between items-center">
                                       <h4 className="font-semibold text-gray-800">{issue.title}</h4>
                                       <span className={`text-xs px-2 py-0.5 rounded-full ${issue.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{issue.severity}</span>
                                   </div>
                                   <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                               </li>
                           ))}
                        </ul>
                    </Card>
                );
            case 'Business Details':
                return (
                    <Card title="Business Details" actions={<button className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1"/> Edit</button>}>
                        <div className="space-y-4">
                           <div>
                                <h4 className="font-medium text-sm text-gray-500">Pricing Model</h4>
                                <p className="text-gray-800">{product.business_details.pricing_model}</p>
                           </div>
                           <div>
                                <h4 className="font-medium text-sm text-gray-500">Target Customer</h4>
                                <p className="text-gray-800">{product.business_details.target_customer}</p>
                           </div>
                           <div>
                                <h4 className="font-medium text-sm text-gray-500">Distribution Channels</h4>
                                <p className="text-gray-800">{product.business_details.distribution_channels}</p>
                           </div>
                        </div>
                    </Card>
                );
             case 'Linked Items':
                return (
                    <div className="space-y-4">
                        <Card title="Linked Tasks"><ul className="space-y-2">{linkedTasks.map(t => <li key={t.id} className="text-sm text-gray-700">{t.name}</li>)}</ul></Card>
                        <Card title="Linked Experiments"><ul className="space-y-2">{linkedExperiments.map(e => <li key={e.id} className="text-sm text-gray-700">{e.name}</li>)}</ul></Card>
                        <Card title="Linked Artifacts"><ul className="space-y-2">{linkedArtifacts.map(a => <li key={a.id} className="text-sm text-gray-700">{a.name}</li>)}</ul></Card>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div>
            <div className="mb-6">
                <button onClick={onBack} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Products
                </button>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                            <p className="text-gray-600">{product.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                             <button className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1"/> Edit Product</button>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>{renderTabContent()}</div>
        </div>
    );
};

export default ProductDetailPage;