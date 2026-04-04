import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface GaugeChartProps {
    value: number;
    max: number;
    title: string;
    subtitle?: string;
    color?: string;
    size?: number;
    showPercentage?: boolean;
    format?: 'currency' | 'percentage' | 'number';
}

const GaugeChart: React.FC<GaugeChartProps> = ({
    value,
    max,
    title,
    subtitle,
    color = '#0ea5e9',
    size = 200,
    showPercentage = true,
    format = 'number'
}) => {
    const percentage = Math.min((value / max) * 100, 100);

    const data = [
        {
            name: title,
            value: percentage,
            fill: color
        }
    ];

    const formatValue = (val: number): string => {
        switch (format) {
            case 'currency':
                return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            case 'percentage':
                return `${val.toFixed(1)}%`;
            default:
                return val.toLocaleString();
        }
    };

    const getColor = () => {
        if (percentage >= 80) return '#10b981'; // green
        if (percentage >= 50) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    const dynamicColor = color === '#0ea5e9' ? getColor() : color;

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size * 0.75 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="70%"
                        innerRadius="80%"
                        outerRadius="100%"
                        barSize={12}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background={{ fill: '#f3f4f6' }}
                            dataKey="value"
                            cornerRadius={10}
                            fill={dynamicColor}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '35%' }}>
                    <div className="text-3xl font-bold text-gray-900">
                        {showPercentage ? `${percentage.toFixed(0)}%` : formatValue(value)}
                    </div>
                    {showPercentage && (
                        <div className="text-sm text-gray-500 mt-1">
                            {formatValue(value)} / {formatValue(max)}
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center mt-2">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

export default GaugeChart;
