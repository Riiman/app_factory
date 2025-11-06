/**
 * @file ExperimentsPage.tsx
 * @description A page component that displays all startup experiments in a card-based layout.
 * Each card is clickable to open a detail modal for that experiment.
 */

import React from 'react';
import { Experiment, ExperimentStatus } from '../types';
import Card from '../components/Card';
import { Plus, Beaker } from 'lucide-react';

/**
 * Props for the ExperimentsPage component.
 * @interface ExperimentsPageProps
 */
interface ExperimentsPageProps {
    /** An array of all experiment objects to be displayed. The backend should provide an array of `Experiment` objects. */
    experiments: Experiment[];
    /** Callback function triggered when an experiment card is clicked. */
    onExperimentClick: (experiment: Experiment) => void;
    /** Callback function triggered when the "Create New Experiment" button is clicked. */
    onAddNewExperiment: () => void;
}

const getStatusColor = (status: ExperimentStatus) => {
    switch (status) {
        case ExperimentStatus.COMPLETED: return 'bg-green-100 text-green-800';
        case ExperimentStatus.RUNNING: return 'bg-yellow-100 text-yellow-800';
        case ExperimentStatus.PLANNED:
        default: return 'bg-gray-100 text-gray-800';
    }
};

const ExperimentsPage: React.FC<ExperimentsPageProps> = ({ experiments, onExperimentClick, onAddNewExperiment }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Experiments</h1>
                <button 
                    onClick={onAddNewExperiment}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Create New Experiment</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experiments.map(experiment => (
                    <div key={experiment.id} onClick={() => onExperimentClick(experiment)} className="cursor-pointer">
                        <Card>
                            <div className="flex justify-between items-start">
                                <div className="flex items-start">
                                    <Beaker className="h-6 w-6 text-brand-secondary mr-3 flex-shrink-0" />
                                    <h3 className="font-semibold text-lg text-gray-900">{experiment.name}</h3>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(experiment.status)}`}>
                                    {experiment.status}
                                </span>
                            </div>
                            <p className="mt-3 text-sm text-gray-600">
                                <span className="font-medium">Assumption:</span> {experiment.assumption}
                            </p>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExperimentsPage;