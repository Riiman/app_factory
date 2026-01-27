import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Target } from 'lucide-react';

interface ComparisonBarProps {
    data: Array<{
        name: string;
        actual: number;
        target: number;
    }>;
    height?: number;
    formatValue?: (value: number) => string;
    showTarget?: boolean;
}

const ComparisonBar: React.FC<ComparisonBarProps> = ({
    data,
    height = 300,
    formatValue = (value) => value.toLocaleString(),
    showTarget = true
}) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const variance = data.actual - data.target;
            const variancePercent = data.target > 0
                ? ((variance / data.target) * 100).toFixed(1)
                : '0.0';

            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Actual:</span>
                            <span className="font-medium text-blue-600">{formatValue(data.actual)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Target:</span>
                            <span className="font-medium text-gray-700">{formatValue(data.target)}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Variance:</span>
                            <span className={`font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {variance >= 0 ? '+' : ''}{formatValue(variance)} ({variancePercent}%)
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomBar = (props: any) => {
        const { fill, x, y, width, height, payload } = props;
        const meetsTarget = payload.actual >= payload.target;
        const barColor = meetsTarget ? '#10b981' : '#f59e0b';

        return (
            <g>
                <rect x={x} y={y} width={width} height={height} fill={barColor} rx={4} />
            </g>
        );
    };

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
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

                    {/* Actual values */}
                    <Bar
                        dataKey="actual"
                        shape={<CustomBar />}
                        radius={[4, 4, 0, 0]}
                    />

                    {/* Target reference lines */}
                    {showTarget && data.map((item, index) => (
                        <ReferenceLine
                            key={`target-${index}`}
                            segment={[
                                { x: index - 0.3, y: item.target },
                                { x: index + 0.3, y: item.target }
                            ]}
                            stroke="#6b7280"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Meets/Exceeds Target</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span className="text-gray-600">Below Target</span>
                </div>
                {showTarget && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-600"></div>
                        <span className="text-gray-600">Target</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComparisonBar;
