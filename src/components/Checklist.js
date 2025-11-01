import React, { useState } from 'react';
import apiService from '../services/api';
import './Checklist.css';

const Checklist = ({ stageKey, tasks, onUpdate }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await apiService.tasks.updateTask(task.id, { status: newStatus });
      onUpdate();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await apiService.tasks.createTask(stageKey, {
        title: newTaskTitle,
        status: 'todo',
        priority: 'p2'
      });
      setNewTaskTitle('');
      setShowAddTask(false);
      onUpdate();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await apiService.tasks.deleteTask(taskId);
      onUpdate();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      p0: '#ef4444',
      p1: '#f59e0b',
      p2: '#3b82f6',
      p3: '#6b7280'
    };
    return colors[priority] || '#6b7280';
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="checklist-container">
      <div className="checklist-header">
        <h3>Tasks & Checklist</h3>
        <button 
          className="btn-primary btn-sm"
          onClick={() => setShowAddTask(!showAddTask)}
        >
          + Add Task
        </button>
      </div>

      {showAddTask && (
        <div className="add-task-form">
          <input
            type="text"
            placeholder="Task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <div className="form-actions">
            <button className="btn-primary" onClick={handleAddTask}>Add</button>
            <button className="btn-secondary" onClick={() => setShowAddTask(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="tasks-list">
        {sortedTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet. Add your first task to get started!</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <div 
              key={task.id} 
              className={`task-item ${task.status === 'done' ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={() => handleToggleTask(task)}
                className="task-checkbox"
              />
              
              <div className="task-content">
                <div className="task-title">{task.title}</div>
                {task.description && (
                  <div className="task-description">{task.description}</div>
                )}
                <div className="task-meta">
                  <span 
                    className="task-priority"
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                  {task.due_date && (
                    <span className="task-due-date">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {task.tags && task.tags.map(tag => (
                    <span key={tag} className="task-tag">{tag}</span>
                  ))}
                </div>
              </div>

              <button 
                className="task-delete"
                onClick={() => handleDeleteTask(task.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Checklist;
