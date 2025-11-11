
import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'N/A' }) => {
  const baseClasses = "px-2.5 py-0.5 text-xs font-medium rounded-full inline-block";
  let colorClasses = "bg-slate-100 text-slate-800"; // default

  // Ensure status is a string before calling toLowerCase
  const safeStatus = String(status || '').toLowerCase();

  switch (safeStatus) {
    case 'active':
    case 'approved':
    case 'live':
    case 'completed':
    case 'resolved':
    case 'published':
    case 'signed':
      colorClasses = "bg-green-100 text-green-800";
      break;
    case 'in_progress':
    case 'running':
    case 'beta':
    case 'sent':
      colorClasses = "bg-blue-100 text-blue-800";
      break;
    case 'pending':
    case 'planned':
    case 'concept':
    case 'open':
    case 'draft':
      colorClasses = "bg-yellow-100 text-yellow-800";
      break;
    case 'inactive':
    case 'archived':
    case 'rejected':
      colorClasses = "bg-gray-100 text-gray-800";
      break;
    case 'high':
      colorClasses = "bg-orange-100 text-orange-800";
      break;
    case 'critical':
        colorClasses = "bg-red-100 text-red-800";
        break;
    default:
        colorClasses = "bg-slate-100 text-slate-800";
        break;
  }

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      {String(status || 'N/A').replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
