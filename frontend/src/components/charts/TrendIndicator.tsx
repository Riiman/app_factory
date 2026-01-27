import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
    value: number;
    period?: string;
    showValue?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
    value,
    period = 'MoM',
    showValue = true,
    size = 'md'
}) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;

    const sizeClasses = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    };

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    const colorClass = isNeutral
        ? 'text-gray-500'
        : isPositive
            ? 'text-green-600'
            : 'text-red-600';

    const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

    return (
        <div className={`flex items-center gap-1 ${colorClass} ${textSizeClasses[size]} font-medium`}>
            <Icon className={sizeClasses[size]} />
            {showValue && (
                <span>
                    {isPositive && '+'}{Math.abs(value).toFixed(1)}%
                </span>
            )}
            {period && showValue && (
                <span className="text-gray-400 font-normal">{period}</span>
            )}
        </div>
    );
};

export default TrendIndicator;
