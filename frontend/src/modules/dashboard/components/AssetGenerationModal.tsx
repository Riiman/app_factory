import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Sparkles, CheckCircle } from 'lucide-react';
import api from '@/utils/api';

interface AssetGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    startupId: number;
    hasProduct: boolean;
    hasGtm: boolean;
}

const AssetGenerationModal: React.FC<AssetGenerationModalProps> = ({ isOpen, onClose, startupId, hasProduct, hasGtm }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateProduct, setGenerateProduct] = useState(!hasProduct);
    const [generateGtm, setGenerateGtm] = useState(!hasGtm);

    useEffect(() => {
        setGenerateProduct(!hasProduct);
        setGenerateGtm(!hasGtm);
    }, [hasProduct, hasGtm]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Use the state values selected by the user
            // const generateProduct = !hasProduct;
            // const generateGtm = !hasGtm;

            await api.generateAssets(startupId, generateProduct, generateGtm);
            alert('Asset generation triggered! This may take a few minutes.');
            onClose();
        } catch (error) {
            console.error("Failed to trigger asset generation:", error);
            alert("Failed to trigger asset generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem(`hide_asset_modal_${startupId}`, 'true');
        }
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-start">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900 flex items-center"
                                    >
                                        <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                                        Generate Startup Assets
                                    </Dialog.Title>
                                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-4">
                                    <p className="text-sm text-gray-500">
                                        Congratulations on being admitted! To help you get started, our AI can automatically generate a comprehensive <strong>Product Strategy</strong> and <strong>Go-to-Market (GTM) Plan</strong> based on your scope document.
                                    </p>

                                    <div className="mt-4 space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                            <h4 className="text-sm font-medium text-gray-900 mb-3">Select items to generate:</h4>

                                            <div className="space-y-3">
                                                <div className="flex items-start">
                                                    <div className="flex h-5 items-center">
                                                        <input
                                                            id="generate_product"
                                                            name="generate_product"
                                                            type="checkbox"
                                                            checked={generateProduct}
                                                            onChange={(e) => setGenerateProduct(e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label htmlFor="generate_product" className="font-medium text-gray-700">Product Strategy & MVP</label>
                                                        <p className="text-gray-500">Includes features list, key metrics, and product definition.</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start">
                                                    <div className="flex h-5 items-center">
                                                        <input
                                                            id="generate_gtm"
                                                            name="generate_gtm"
                                                            type="checkbox"
                                                            checked={generateGtm}
                                                            onChange={(e) => setGenerateGtm(e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label htmlFor="generate_gtm" className="font-medium text-gray-700">Go-to-Market Plan</label>
                                                        <p className="text-gray-500">Includes marketing campaigns, content calendar, and positioning.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col space-y-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:bg-purple-300 disabled:cursor-not-allowed"
                                        onClick={handleGenerate}
                                        disabled={isGenerating || (!generateProduct && !generateGtm)}
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Automatically (Recommended)'}
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                        onClick={handleClose}
                                    >
                                        I'll do it manually
                                    </button>
                                </div>

                                <div className="mt-4 flex items-center">
                                    <input
                                        id="dont-show"
                                        type="checkbox"
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="dont-show" className="ml-2 block text-xs text-gray-500">
                                        Don't show me this again
                                    </label>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default AssetGenerationModal;
