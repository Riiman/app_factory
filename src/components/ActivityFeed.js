import React from 'react';
import './ActivityFeed.css';

const ActivityFeed = ({ activity }) => {
  if (!activity || (!activity.tasks?.length && !activity.artifacts?.length)) {
    return (
      <div className="empty-state">
        <p>No recent activity</p>
      </div>
    );
  }

  const allActivity = [
    ...activity.tasks.map(t => ({ ...t, type: 'task', time: t.updated_at })),
    ...activity.artifacts.map(a => ({ ...a, type: 'artifact', time: a.created_at }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  const getActivityIcon = (type, status) => {
    if (type === 'task') {
      return status === 'done' ? '✅' : '📝';
    }
    return '📎';
  };

  const getActivityText = (item) => {
    if (item.type === 'task') {
      return item.status === 'done' ? 'Completed task' : 'Updated task';
    }
    return 'Added artifact';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="activity-feed">
      {allActivity.slice(0, 10).map((item, index) => (
        <div key={`${item.type}-${item.id}-${index}`} className="activity-item">
          <span className="activity-icon">{getActivityIcon(item.type, item.status)}</span>
          <div className="activity-content">
            <p className="activity-text">
              <strong>{getActivityText(item)}:</strong> {item.title}
            </p>
            <span className="activity-time">{formatTime(item.time)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
