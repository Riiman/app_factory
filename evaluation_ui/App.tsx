import React, { useState, useMemo } from 'react';
import { initialTasks } from './constants';
import { Task, TaskStatus, TaskResult } from './types';
import TaskList from './components/TaskList';
import TaskDetail from './components/TaskDetail';
import { AppIcon } from './components/icons';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('1');

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleAddTaskResult = (taskId: string, result: Omit<TaskResult, 'id' | 'addedAt'>) => {
    const newResult: TaskResult = {
      ...result,
      id: `res-${taskId}-${Date.now()}`,
      addedAt: new Date().toISOString(),
    };

    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        return { ...task, results: [...task.results, newResult] };
      }
      return task;
    }));
  };
  
  const handleSetTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
            return { ...task, status };
        }
        return task;
    }));
  };

  return (
    <div className="flex flex-col h-screen font-sans text-gray-800">
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <AppIcon className="w-8 h-8 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
        </div>
        <div className="flex items-center space-x-4">
          <img src="https://picsum.photos/40/40" alt="User Avatar" className="w-10 h-10 rounded-full" />
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="w-1/3 max-w-sm border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
          />
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <TaskDetail
            task={selectedTask}
            onUpdateTask={handleUpdateTask}
            onAddTaskResult={handleAddTaskResult}
            onSetTaskStatus={handleSetTaskStatus}
          />
        </main>
      </div>
    </div>
  );
};

export default App;