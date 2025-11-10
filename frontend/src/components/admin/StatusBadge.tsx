
import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const baseClasses = "px-2.5 py-0.5 text-xs font-medium rounded-full inline-block";
  let colorClasses = "bg-slate-100 text-slate-800"; // default

  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'live':
    case 'completed':
    case 'resolved':
    case 'published':
      colorClasses = "bg-green-100 text-green-800";
      break;
    case 'in_progress':
    case 'running':
    case 'beta':
      colorClasses = "bg-blue-100 text-blue-800";
      break;
    case 'pending':
    case 'planned':
    case 'concept':
    case 'open':
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
  }

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
