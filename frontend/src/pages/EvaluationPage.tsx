import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, TaskResult } from '../components/evaluation/evaluation-types';
import TaskList from '../components/evaluation/TaskList';
import TaskDetail from '../components/evaluation/TaskDetail';
import api from '../utils/api'; // To be used later for backend integration

// Mock data, to be replaced with API calls
const initialTasks: Task[] = [
    {
      id: '1',
      title: 'Submit Pitch Deck',
      description: 'Upload your latest pitch deck in PDF format. It should cover the problem, solution, market size, and your team.',
      status: TaskStatus.PENDING,
      dueDate: '2024-08-15',
      results: [],
    },
    {
      id: '2',
      title: 'Complete Founder Bio',
      description: 'Fill out the founder biography form. Include your background, experience, and motivation for this startup.',
      status: TaskStatus.PENDING,
      dueDate: '2024-08-18',
      results: [],
    },
];

const EvaluationPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const fetchedTasks = await api.getEvaluationTasks();
        setTasks(fetchedTasks);
        if (fetchedTasks.length > 0) {
          setSelectedTaskId(fetchedTasks[0].id);
        }
      } catch (err) {
        setError('Failed to load evaluation tasks.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const selectedTask = useMemo(
    () => tasks?.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );
  
  // ... (handler functions remain the same for now, will be wired up later) ...

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading tasks...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }
  
  if (!tasks || tasks.length === 0) {
    return <div className="flex items-center justify-center h-full">No evaluation tasks assigned yet.</div>;
  }

  return (
    <div className="flex flex-1 min-h-0 bg-white">
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
  );
};

export default EvaluationPage;
