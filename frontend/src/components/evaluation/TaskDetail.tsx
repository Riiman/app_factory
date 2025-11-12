import React, { useState, useRef } from 'react';
import { Task, TaskStatus } from '@/types/dashboard-types';
import { CheckCircleIcon, LinkIcon, PaperClipIcon, UploadIcon, XCircleIcon } from './icons';

interface TaskDetailProps {
  task: Task | null;
  onUpdateTask: (task: Task) => void;
  onSetTaskStatus: (taskId: string, status: TaskStatus) => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onSetTaskStatus }) => {
  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-xl">Select a task to see the details</p>
      </div>
    );
  }

  const isCompleted = task.status === TaskStatus.Completed;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-3xl font-bold text-gray-900">{task.title}</h2>
        {isCompleted ? (
            <button onClick={() => onSetTaskStatus(task.id, TaskStatus.InProgress)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700">
                <XCircleIcon className="w-5 h-5 mr-2" />
                Mark as In Progress
            </button>
        ) : (
            <button onClick={() => onSetTaskStatus(task.id, TaskStatus.Completed)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Mark as Complete
            </button>
        )}
      </div>

      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6">
        <span>Due: <span className="font-semibold text-gray-700">{new Date(task.dueDate).toLocaleDateString()}</span></span>
        <span>Assigned by: <span className="font-semibold text-gray-700">{task.assignedBy}</span></span>
        <span>Status: <span className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-yellow-600'}`}>{task.status}</span></span>
      </div>

      <div className="prose max-w-none">
        <h3 className="text-xl font-semibold mb-2">Description</h3>
        <p className="text-gray-700">{task.description}</p>
      </div>


    </div>
  );
};

export default TaskDetail;