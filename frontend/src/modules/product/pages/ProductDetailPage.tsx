import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, Task, Experiment, Artifact, Feature, ProductMetric, ProductBusinessDetails } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { ArrowLeft, Plus, Edit } from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';

/**
 * Props for the ProductDetailPage component.
 * @interface ProductDetailPageProps
 */
interface ProductDetailPageProps {
    /** The ID of the product to be displayed. */
    productId: number;
    /** Callback function to navigate back to the product list page. */
    onBack: () => void;
    /** Callback function to open the "Create Feature" modal. */
    onAddFeature: () => void;
    /** Callback function to open the "Create Metric" modal. */
    onAddMetric: () => void;
    /** Callback function to open the "Create Issue" modal. */
    onAddIssue: () => void;
    /** Callback function to open the "Edit Product" modal. */
    onEditProduct: (product: Product) => void;
    /** Callback function to open the "Edit Product Business Details" modal. */
    onEditProductBusinessDetails: (productId: number, businessDetails: ProductBusinessDetails) => void;
    /** Callback function to open the "Edit Metric" modal. */
    onEditMetric: (productId: number, metric: ProductMetric) => void;
    onEditFeature: (productId: number, feature: Feature) => void;
}


import { RoadmapView, BacklogView, SprintView, ReleaseView } from '../components/planner';

// ... (existing imports, but remove tab definition)

type Tab = 'Roadmap' | 'Backlog' | 'Sprints' | 'Releases' | 'Metrics' | 'Issues' | 'Linked Items';

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
    productId,
    onBack,
    onAddFeature,
    onAddMetric,
    onAddIssue,
    onEditProduct,
    onEditProductBusinessDetails,
    onEditMetric,
    onEditFeature
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('Roadmap');
    const tabs: Tab[] = ['Roadmap', 'Backlog', 'Sprints', 'Releases', 'Metrics', 'Issues', 'Linked Items'];

    // Delete Confirmation State
    const [deleteConfirmState, setDeleteConfirmState] = useState<{
        isOpen: boolean;
        type: 'feature' | 'metric' | 'issue' | null;
        id: number | null;
        name: string;
    }>({ isOpen: false, type: null, id: null, name: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const queryClient = useQueryClient();

    // Fetch Product Data
    const { data: products = [] } = useQuery({
        queryKey: ['products', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getProducts(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const product = products.find((p: Product) => p.id === productId);

    // Fetch Linked Items
    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', user?.startup_id],
        queryFn: () => user?.startup_id ? api.getTasks(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const { data: experiments = [] } = useQuery({
        queryKey: ['experiments', user?.startup_id],
        // Assuming api.getExperiments exists. If not, this might fail or need fallback.
        // If it doesn't exist, we should rely on a generic fetch or add it.
        // For now, casting strictness aside to assume it will be there or similar
        queryFn: () => user?.startup_id ? (api as any).getExperiments(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const { data: artifacts = [] } = useQuery({
        queryKey: ['artifacts', user?.startup_id],
        // Assuming api.getArtifacts exists.
        queryFn: () => user?.startup_id ? (api as any).getArtifacts(user.startup_id) : Promise.resolve([]),
        enabled: !!user?.startup_id
    });

    const linkedTasks = tasks.filter((t: Task) => t.linked_to_type === 'Product' && t.linked_to_id === productId);
    const linkedExperiments = experiments.filter((e: Experiment) => e.linked_to_type === 'Product' && e.linked_to_id === productId);
    const linkedArtifacts = artifacts.filter((a: Artifact) => a.linked_to_type === 'Product' && a.linked_to_id === productId);

    const handleDeleteClick = (type: 'feature' | 'metric' | 'issue', id: number, name: string) => {
        setDeleteConfirmState({ isOpen: true, type, id, name });
    };

    const handleConfirmDelete = async () => {
        if (!user?.startup_id || !deleteConfirmState.id || !deleteConfirmState.type) return;

        setIsDeleting(true);
        try {
            if (deleteConfirmState.type === 'feature') {
                await api.deleteFeature(user.startup_id, productId, deleteConfirmState.id);
            } else if (deleteConfirmState.type === 'metric') {
                await api.deleteMetric(user.startup_id, productId, deleteConfirmState.id);
            } else if (deleteConfirmState.type === 'issue') {
                await api.deleteIssue(user.startup_id, productId, deleteConfirmState.id);
            }
            // Invalidate products query to refresh the list
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            if (user?.startup_id) {
                await queryClient.invalidateQueries({ queryKey: ['products', user.startup_id] });
            }
            setDeleteConfirmState({ isOpen: false, type: null, id: null, name: '' });
        } catch (error) {
            console.error(`Failed to delete ${deleteConfirmState.type}:`, error);
            alert(`Failed to delete ${deleteConfirmState.type}`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!product) {
        return <div className="p-4">Loading product or product not found...</div>;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Roadmap':
                return <RoadmapView product={product} />;
            case 'Backlog':
                return <BacklogView product={product} onAddFeature={onAddFeature} onEditFeature={(f) => onEditFeature(product.id, f)} />;
            case 'Sprints':
                return <SprintView product={product} />;
            case 'Releases':
                return <ReleaseView product={product} />;
            case 'Metrics':
                return (
                    <Card title="Metrics" actions={<button onClick={onAddMetric} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Add Metric</button>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(product.product_metrics || []).map((metric: ProductMetric) => (
                                metric && (
                                    <div key={metric.metric_id} className="p-4 bg-gray-50 rounded-lg relative group">
                                        <p className="text-sm text-gray-500">{metric.metric_name}</p>
                                        <p className="text-2xl font-bold text-gray-900">{metric.value?.toLocaleString() ?? 'N/A'} <span className="text-base font-normal text-gray-600">{metric.unit}</span></p>
                                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEditMetric(product.id, metric)} className="p-1 text-gray-400 hover:text-gray-600 rounded-md">
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick('metric', metric.metric_id, metric.metric_name)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded-md"
                                                title="Delete Metric"
                                            >
                                                <Plus size={16} className="rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </Card>
                );
            case 'Issues':
                return (
                    <Card title="Issues & Feedback" actions={<button onClick={onAddIssue} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1" /> Report Issue</button>}>
                        <ul className="divide-y divide-gray-200">
                            {(product.product_issues || []).map((issue: any) => (
                                <li key={issue.issue_id} className="py-4 group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-gray-800">{issue.title}</h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${issue.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{issue.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteClick('issue', issue.issue_id, issue.title)}
                                            className="ml-4 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Issue"
                                        >
                                            <Plus size={16} className="rotate-45" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                );
            case 'Linked Items':
                return (
                    <div className="space-y-4">
                        <Card title="Linked Tasks"><ul className="space-y-2">{linkedTasks.map((t: Task) => <li key={t.id} className="text-sm text-gray-700">{t.name}</li>)}</ul></Card>
                        <Card title="Linked Experiments"><ul className="space-y-2">{linkedExperiments.map((e: Experiment) => <li key={e.id} className="text-sm text-gray-700">{e.name}</li>)}</ul></Card>
                        <Card title="Linked Artifacts"><ul className="space-y-2">{linkedArtifacts.map((a: Artifact) => <li key={a.id} className="text-sm text-gray-700">{a.name}</li>)}</ul></Card>
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
                            <button onClick={() => onEditProduct(product)} className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1" /> Edit Product</button>
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
                            className={`${activeTab === tab
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

            <ConfirmationModal
                isOpen={deleteConfirmState.isOpen}
                onClose={() => setDeleteConfirmState({ ...deleteConfirmState, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={`Delete ${deleteConfirmState.type ? deleteConfirmState.type.charAt(0).toUpperCase() + deleteConfirmState.type.slice(1) : 'Item'}`}
                message={`Are you sure you want to delete "${deleteConfirmState.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isProcessing={isDeleting}
            />
        </div>
    );
};

export default ProductDetailPage;