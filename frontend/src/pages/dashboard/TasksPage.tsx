/**
 * @file TasksPage.tsx
 * @description A page component that displays all tasks in a Kanban board format.
 * The board is divided into columns based on task status (Pending, In Progress, Completed).
 * Task cards are clickable to open a detail modal.
 */

import React, { useEffect, useState } from 'react';
import { Task, TaskStatus } from '@/types/dashboard-types';
import { Plus } from 'lucide-react';
import api from '../../utils/api';

interface TaskCardProps {
    task: Task;
    onClick: () => void;
}

interface KanbanColumnProps {
    title: TaskStatus;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

/**
 * Props for the TasksPage component.
 * @interface TasksPageProps
 */
interface TasksPageProps {
    startupId: number;
    tasks: Task[] | null;
    setTasks: (tasks: Task[]) => void;
    onTaskClick: (task: Task) => void;
    onAddNewTask: () => void;
}

const getStatusColor = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.PENDING: return 'bg-gray-400';
        case TaskStatus.IN_PROGRESS: return 'bg-yellow-500';
        case TaskStatus.COMPLETED: return 'bg-green-500';
    }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => (
    <button onClick={onClick} className="w-full bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-3 text-left cursor-pointer hover:shadow-md hover:border-brand-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary">
        <p className="font-medium text-sm text-gray-800">{task.name}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
        <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-500">Due: {task.due_date || 'N/A'}</span>
            {task.linked_to_type && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800 capitalize">
                    {task.scope.toLowerCase()}
                </span>
            )}
        </div>
    </button>
);


const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, onTaskClick }) => (
    <div className="bg-gray-100 rounded-lg p-3 w-full md:w-1/3 flex flex-col">
        <div className="flex items-center mb-4">
            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusColor(title)}`}></span>
            <h3 className="font-semibold text-gray-700 capitalize">{title.replace('_', ' ').toLowerCase()}</h3>
            <span className="ml-2 text-sm text-gray-500 bg-gray-200 rounded-full px-2">{tasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-1">
            {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />)}
        </div>
    </div>
);


const TasksPage: React.FC<TasksPageProps> = ({ startupId, tasks, setTasks, onTaskClick, onAddNewTask }) => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tasks === null) {
            setLoading(true);
            api.getTasks(startupId)
                .then(setTasks)
                .catch(err => console.error("Failed to fetch tasks", err))
                .finally(() => setLoading(false));
        }
    }, [startupId, tasks, setTasks]);

    if (loading || tasks === null) {
        return <div>Loading tasks...</div>;
    }

    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                <button 
                    onClick={onAddNewTask}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Create New Task</span>
                </button>
            </div>
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 h-[calc(100vh-12rem)]">
                <KanbanColumn title={TaskStatus.PENDING} tasks={pendingTasks} onTaskClick={onTaskClick} />
                <KanbanColumn title={TaskStatus.IN_PROGRESS} tasks={inProgressTasks} onTaskClick={onTaskClick} />
                <KanbanColumn title={TaskStatus.COMPLETED} tasks={completedTasks} onTaskClick={onTaskClick} />
            </div>
        </div>
    );
};

export default TasksPage;