import React from 'react';
import { Task, TaskStatus } from '@/types/dashboard-types';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
}

const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
  const statusClasses =
    status === TaskStatus.Completed
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
  return <span className={`${baseClasses} ${statusClasses}`}>{status}</span>;
};


const TaskListItem: React.FC<{ task: Task; isSelected: boolean; onSelect: () => void; }> = ({ task, isSelected, onSelect }) => {
    const selectedClasses = isSelected
    ? 'bg-indigo-100 border-indigo-500'
    : 'border-transparent hover:bg-gray-200';

    return (
        <li
            onClick={onSelect}
            className={`p-4 cursor-pointer border-l-4 transition-colors duration-150 ${selectedClasses}`}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-800">{task.title}</h3>
                <TaskStatusBadge status={task.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
        </li>
    );
};


const TaskList: React.FC<TaskListProps> = ({ tasks, selectedTaskId, onSelectTask }) => {
  return (
    <div className="h-full">
        <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Tasks</h2>
        </div>
        <ul className="divide-y divide-gray-200">
            {tasks.map((task) => (
                <TaskListItem 
                    key={task.id}
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onSelect={() => onSelectTask(task.id)}
                />
            ))}
        </ul>
    </div>
  );
};

export default TaskList;