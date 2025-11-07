import React, { useState, useRef } from 'react';
import { Task, TaskResult, TaskStatus } from './evaluation-types';
import { CheckCircleIcon, LinkIcon, PaperClipIcon, UploadIcon, XCircleIcon } from './icons';

interface TaskDetailProps {
  task: Task | null;
  onUpdateTask: (task: Task) => void;
  onAddTaskResult: (taskId: string, result: Omit<TaskResult, 'id' | 'addedAt'>) => void;
  onSetTaskStatus: (taskId: string, status: TaskStatus) => void;
}

const ResultInput: React.FC<{ onAddResult: (result: Omit<TaskResult, 'id' | 'addedAt'>) => void }> = ({ onAddResult }) => {
  const [link, setLink] = useState('');
  const [linkName, setLinkName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (link.trim() && linkName.trim()) {
      onAddResult({ type: 'link', name: linkName, url: link });
      setLink('');
      setLinkName('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      onAddResult({ type: 'file', name: selectedFile.name, file: selectedFile });
      setFile(null); // Reset after adding
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear the input
      }
    }
  };
  
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">Add Task Result</h4>
        <form onSubmit={handleAddLink} className="flex items-center space-x-2 mb-3">
            <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Link Name"
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50" disabled={!link || !linkName}>Add Link</button>
        </form>
        <div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <UploadIcon className="w-5 h-5 mr-2" />
                Upload File
            </label>
        </div>
    </div>
  );
};

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onAddTaskResult, onSetTaskStatus }) => {
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

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Results</h3>
        {task.results.length > 0 ? (
          <ul className="space-y-3">
            {task.results.map(result => (
              <li key={result.id} className="flex items-center p-3 bg-gray-100 rounded-md">
                {result.type === 'link' ? <LinkIcon className="w-5 h-5 mr-3 text-indigo-500"/> : <PaperClipIcon className="w-5 h-5 mr-3 text-indigo-500"/>}
                {result.type === 'link' ? (
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{result.name}</a>
                ) : (
                  <span>{result.name}</span>
                )}
                 <span className="text-xs text-gray-400 ml-auto">{new Date(result.addedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No results have been added for this task yet.</p>
        )}

        {!isCompleted && <ResultInput onAddResult={(result) => onAddTaskResult(task.id, result)} />}
      </div>
    </div>
  );
};

export default TaskDetail;