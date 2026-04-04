import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  format?: 'currency' | 'percentage' | 'number';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  valueColor = 'text-gray-900',
  format = 'number'
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600';
    if (trend.value < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        {icon && (
          <div className={`p-2 ${iconBgColor} rounded-lg`}>
            <div className={iconColor}>{icon}</div>
          </div>
        )}
      </div>

      <h3 className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">{title}</h3>

      <div className="flex items-baseline gap-2 mb-1">
        <p className={`text-2xl font-bold ${valueColor}`}>
          {formatValue(value)}
        </p>
        {trend && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>

      {(subtitle || trend?.label) && (
        <p className="text-xs text-gray-500">
          {trend?.label || subtitle}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
