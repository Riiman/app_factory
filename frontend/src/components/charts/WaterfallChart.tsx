import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface WaterfallChartProps {
    data: Array<{
        name: string;
        value: number;
        type?: 'increase' | 'decrease' | 'total';
    }>;
    height?: number;
    formatValue?: (value: number) => string;
    startLabel?: string;
    endLabel?: string;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({
    data,
    height = 350,
    formatValue = (value) => `$${value.toLocaleString()}`,
    startLabel = 'Starting',
    endLabel = 'Ending'
}) => {
    // Calculate cumulative values for waterfall effect
    let cumulative = 0;
    const waterfallData = data.map((item, index) => {
        const start = cumulative;
        cumulative += item.value;
        const end = cumulative;

        // Determine type if not specified
        let type = item.type;
        if (!type) {
            if (index === 0) type = 'total';
            else if (index === data.length - 1) type = 'total';
            else type = item.value >= 0 ? 'increase' : 'decrease';
        }

        return {
            name: item.name,
            value: Math.abs(item.value),
            start: Math.min(start, end),
            end: Math.max(start, end),
            isIncrease: item.value >= 0,
            type,
            displayValue: item.value
        };
    });

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                    <div className="space-y-1 text-sm">
                        <p className={`font-medium ${data.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                            {data.isIncrease ? '+' : ''}{formatValue(data.displayValue)}
                        </p>
                        {data.type !== 'total' && (
                            <p className="text-gray-600">
                                Running Total: {formatValue(data.end)}
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const getBarColor = (item: any) => {
        if (item.type === 'total') return '#6b7280'; // gray
        return item.isIncrease ? '#10b981' : '#ef4444'; // green or red
    };

    const CustomBar = (props: any) => {
        const { fill, x, y, width, height, payload } = props;
        const color = getBarColor(payload);

        // For non-total bars, we need to position them correctly
        if (payload.type !== 'total') {
            const barHeight = height;
            const barY = payload.isIncrease ? y : y;

            return (
                <g>
                    {/* Connector line from previous bar */}
                    {props.index > 0 && (
                        <line
                            x1={x - 10}
                            y1={payload.start * (props.height / props.yMax)}
                            x2={x}
                            y2={payload.start * (props.height / props.yMax)}
                            stroke="#d1d5db"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                        />
                    )}
                    <rect
                        x={x}
                        y={barY}
                        width={width}
                        height={barHeight}
                        fill={color}
                        rx={4}
                    />
                </g>
            );
        }

        return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} />;
    };

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={waterfallData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                        tickFormatter={formatValue}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar
                        dataKey="value"
                        shape={<CustomBar />}
                    >
                        {waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Inflow</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-gray-600">Outflow</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded"></div>
                    <span className="text-gray-600">Total</span>
                </div>
            </div>
        </div>
    );
};

export default WaterfallChart;
