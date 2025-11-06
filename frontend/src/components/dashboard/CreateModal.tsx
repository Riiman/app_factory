/**
 * @file CreateModal.tsx
 * @description The main "Create New..." modal that acts as a gateway or menu.
 * It appears when the global "Create" button in the header is clicked, offering
 * the user a choice of what type of item to create (Task, Experiment, or Artifact).
 */

import React from 'react';
import { X, ListTodo, Beaker, Paperclip } from 'lucide-react';

type CreateModalType = 'task' | 'experiment' | 'artifact';

/**
 * Props for the CreateModal component.
 * @interface CreateModalProps
 */
interface CreateModalProps {
    /** Callback function to close the modal. */
    onClose: () => void;
    /** Callback function triggered when the user selects an item type to create. */
    onSelectCreateType: (type: CreateModalType) => void;
}

const CreateOption: React.FC<{ icon: React.ElementType, title: string, description: string, onClick: () => void }> = ({ icon: Icon, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-start p-4 rounded-lg text-left hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
    >
        <div className="bg-indigo-100 rounded-lg p-3 mr-4">
            <Icon className="h-6 w-6 text-brand-primary" />
        </div>
        <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
    </button>
);

const CreateModal: React.FC<CreateModalProps> = ({ onClose, onSelectCreateType }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New...</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <CreateOption
                        icon={ListTodo}
                        title="New Task"
                        description="Assign a new to-do item for yourself or your team."
                        onClick={() => onSelectCreateType('task')}
                    />
                    <CreateOption
                        icon={Beaker}
                        title="New Experiment"
                        description="Define a new hypothesis to test for your product or marketing."
                        onClick={() => onSelectCreateType('experiment')}
                    />
                    <CreateOption
                        icon={Paperclip}
                        title="New Artifact"
                        description="Upload a file, add a link, or save a note as a new artifact."
                        onClick={() => onSelectCreateType('artifact')}
                    />
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default CreateModal;