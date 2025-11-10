import React from 'react';
// FIX: Import the Card component.
import Card from './Card';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, change, changeType }) => {
  const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

  return (
    <Card className="flex items-start">
      <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-lg mr-4">
        {icon}
      </div>
      <div>
        <p className="text-sm text-brand-text-secondary font-medium">{label}</p>
        <p className="text-2xl font-bold text-brand-text-primary">{value}</p>
        {change && (
          <p className={`text-xs font-medium ${changeColor}`}>{change}</p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
