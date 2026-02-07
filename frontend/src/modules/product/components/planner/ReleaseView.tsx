import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, Release } from '@/types/dashboard-types';
import api from '@/utils/api';
import Card from '@/components/Card';
import { Plus, Package, Calendar, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateReleaseModal from '../CreateReleaseModal';
import PlanReleaseModal from './PlanReleaseModal';

interface ReleaseViewProps {
    product: Product;
}

const ReleaseView: React.FC<ReleaseViewProps> = ({ product }) => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [planningRelease, setPlanningRelease] = useState<Release | null>(null);

    const { data: releases = [], isLoading } = useQuery({
        queryKey: ['releases', product.id],
        queryFn: () => api.getReleases(product.id)
    });

    const createReleaseMutation = useMutation({
        mutationFn: (data: any) => api.createRelease(product.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['releases', product.id] });
            toast.success('Release created');
            setIsCreateModalOpen(false);
        },
        onError: () => toast.error('Failed to create release')
    });

    if (isLoading) return <div>Loading releases...</div>;

    const plannedReleases = releases.filter((r: any) => r.status !== 'SHIPPED');
    const shippedReleases = releases.filter((r: any) => r.status === 'SHIPPED');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Release Management</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-primary/90 transition-all font-medium text-sm"
                >
                    <Plus size={18} className="mr-2" /> New Release
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plannedReleases.map((release: any) => (
                    <div key={release.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Package size={80} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-gray-900">{release.version}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${release.status === 'PLANNED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                                    {release.status}
                                </span>
                            </div>

                            <h4 className="text-sm font-medium text-gray-700 mb-1">{release.name || 'Untitled Release'}</h4>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">{release.description || 'No description provided.'}</p>

                            <div className="flex items-center text-xs text-gray-500 mb-4">
                                <Calendar size={14} className="mr-1.5" />
                                Target: {new Date(release.target_date).toLocaleDateString()}
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                <button
                                    onClick={() => setPlanningRelease(release)}
                                    className="text-sm text-brand-primary font-medium hover:underline flex items-center"
                                >
                                    <Settings size={14} className="mr-1" /> Manage Content
                                </button>
                                {release.release_notes ? (
                                    <button
                                        onClick={() => {
                                            // Simple view for now, usually a modal
                                            alert(release.release_notes);
                                        }}
                                        className="text-sm text-gray-500 font-medium hover:text-gray-700 hover:underline flex items-center"
                                    >
                                        View Notes
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const promise = api.generateReleaseNotes(release.id);
                                            toast.promise(promise, {
                                                loading: 'Generating notes...',
                                                success: 'Notes generated!',
                                                error: 'Failed to generate notes'
                                            });
                                            promise.then(() => {
                                                queryClient.invalidateQueries({ queryKey: ['releases', product.id] });
                                            });
                                        }}
                                        className="text-sm text-gray-500 font-medium hover:text-gray-700 hover:underline flex items-center"
                                    >
                                        Generate Notes
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {plannedReleases.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 mb-2">No planned releases.</p>
                        <button onClick={() => setIsCreateModalOpen(true)} className="text-brand-primary font-medium hover:underline">Create your first release</button>
                    </div>
                )}
            </div>

            {shippedReleases.length > 0 && (
                <div className="pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 opacity-70">Past Releases</h3>
                    <div className="space-y-3 opacity-70">
                        {shippedReleases.map((release: any) => (
                            <div key={release.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-gray-700">{release.version}</span>
                                        <span className="text-sm text-gray-600">{release.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">Shipped on {new Date(release.target_date).toLocaleDateString()}</div>
                                </div>
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold uppercase">Shipped</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <CreateReleaseModal
                    productId={product.id}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={createReleaseMutation.mutate}
                />
            )}

            {planningRelease && (
                <PlanReleaseModal
                    product={product}
                    release={planningRelease}
                    onClose={() => setPlanningRelease(null)}
                />
            )}
        </div>
    );
};

export default ReleaseView;
