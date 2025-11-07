/**
 * @file TaskDetailModal.tsx
 * @description A modal component to display the detailed information of a single task.
 * It shows the task's description, due date, status, and what it's linked to.
 */

import React from 'react';
import { Task, TaskStatus } from '@/types/dashboard-types';
import { X, Calendar, Tag, Link as LinkIcon, FileText } from 'lucide-react';

/**
 * Props for the TaskDetailModal component.
 * @interface TaskDetailModalProps
 */
interface TaskDetailModalProps {
    /** The task object containing all details to be displayed. The backend should provide an object conforming to the `Task` interface. */
    task: Task;
    /** The resolved name of the entity the task is linked to (e.g., 'SaaS Platform'). This is derived on the frontend. */
    linkedEntityName: string | null;
    /** Callback function to close the modal. */
    onClose: () => void;
}

const getStatusClasses = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.PENDING: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
        case TaskStatus.IN_PROGRESS: return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
        case TaskStatus.COMPLETED: return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
    }
};

const DetailItem: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <div className="text-md text-gray-800">{children}</div>
        </div>
    </div>
);

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, linkedEntityName, onClose }) => {
    const statusClasses = getStatusClasses(task.status);
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate pr-4">{task.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DetailItem icon={Calendar} label="Due Date">
                            <span className="font-semibold">{task.due_date || 'Not set'}</span>
                        </DetailItem>
                        <DetailItem icon={Tag} label="Status">
                            <span className={`px-2 py-0.5 text-sm font-semibold rounded-md ${statusClasses.bg} ${statusClasses.text}`}>
                                {task.status.replace('_', ' ').toLowerCase()}
                            </span>
                        </DetailItem>
                        {linkedEntityName && (
                            <DetailItem icon={LinkIcon} label="Linked To">
                                <div className="font-semibold text-brand-primary flex items-center">
                                    <span className="mr-2">{task.linked_to_type}</span>
                                    <span>{linkedEntityName}</span>
                                </div>
                            </DetailItem>
                        )}
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <DetailItem icon={FileText} label="Description">
                            <p className="whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                        </DetailItem>
                    </div>
                </div>
                 <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium">
                        Edit Task
                    </button>
                    <button className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 text-sm font-medium">
                        Mark as Complete
                    </button>
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

export default TaskDetailModal;