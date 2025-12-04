import React, { useEffect, useState } from 'react';
import api from './api';

function DashboardHome() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Assume user info is stored in localStorage after login
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }
    api.get(`/users/${user.id}/tasks`)
      .then(res => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to fetch tasks');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;

  return (
    <div>
      <h2>Welcome to your Dashboard!</h2>
      <p>This is your main dashboard area. Here you can see an overview of your activity.</p>
      <h3>Your Tasks</h3>
      {tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <li key={task.id}>{task.title} {task.completed ? '(Completed)' : ''}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DashboardHome;
