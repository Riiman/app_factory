import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunnelChartProps {
    data: Array<{
        stage: string;
        value: number;
        count?: number;
    }>;
    colors?: string[];
    height?: number;
    showLabels?: boolean;
    formatValue?: (value: number) => string;
}

const FunnelChart: React.FC<FunnelChartProps> = ({
    data,
    colors = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'],
    height = 400,
    showLabels = true,
    formatValue = (value) => value.toLocaleString()
}) => {
    // Calculate conversion rates
    const enrichedData = data.map((item, index) => {
        let conversionRate = '100.0';
        if (index > 0) {
            const prevValue = data[index - 1].value;
            if (prevValue > 0) {
                conversionRate = ((item.value / prevValue) * 100).toFixed(1);
            } else {
                conversionRate = '0.0';
            }
        }

        return {
            ...item,
            conversionRate: parseFloat(conversionRate),
            fill: colors[index % colors.length]
        };
    });

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">{data.stage}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                            Value: <span className="font-medium text-gray-900">{formatValue(data.value)}</span>
                        </p>
                        {data.count !== undefined && (
                            <p className="text-gray-600">
                                Count: <span className="font-medium text-gray-900">{data.count}</span>
                            </p>
                        )}
                        <p className="text-gray-600">
                            Conversion: <span className="font-medium text-green-600">{data.conversionRate}%</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomLabel = (props: any) => {
        const { x, y, width, height, value, index } = props;
        const data = enrichedData[index];

        return (
            <g>
                <text
                    x={x + width / 2}
                    y={y + height / 2 - 10}
                    fill="#fff"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-semibold text-sm"
                >
                    {formatValue(value)}
                </text>
                {index > 0 && (
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        fill="#fff"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs"
                        opacity={0.9}
                    >
                        {data.conversionRate}% conv.
                    </text>
                )}
            </g>
        );
    };

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={enrichedData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={formatValue} stroke="#9ca3af" />
                    <YAxis
                        type="category"
                        dataKey="stage"
                        width={90}
                        tick={{ fill: '#4b5563', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar
                        dataKey="value"
                        radius={[0, 8, 8, 0]}
                        label={showLabels ? <CustomLabel /> : undefined}
                    >
                        {enrichedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Conversion Rate Summary */}
            <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="text-center">
                    <p className="text-gray-500">Overall Conversion</p>
                    <p className="text-lg font-semibold text-gray-900">
                        {data.length > 0 && data[0].value > 0
                            ? ((data[data.length - 1].value / data[0].value) * 100).toFixed(1)
                            : '0.0'}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500">Total Value</p>
                    <p className="text-lg font-semibold text-gray-900">
                        {formatValue(data[data.length - 1]?.value || 0)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FunnelChart;
