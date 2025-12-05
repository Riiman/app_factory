import React from 'react';
import './Dashboard.css';

function Dashboard({ children }) {
  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">MyApp</div>
        <nav className="dashboard-nav">
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/tasks">Tasks</a></li>
            <li><a href="/profile">Profile</a></li>
            <li><a href="/logout">Logout</a></li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
        </header>
        <section className="dashboard-content">
          {children}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
