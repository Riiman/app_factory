
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BusinessMonthlyData } from '../../types';

interface BusinessPerformanceChartProps {
  data: BusinessMonthlyData[];
}

const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}k`;

const BusinessPerformanceChart: React.FC<BusinessPerformanceChartProps> = ({ data }) => {
  const chartData = data.map(d => ({
    ...d,
    month: new Date(d.monthStart).toLocaleString('default', { month: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#475569" />
        <YAxis tickFormatter={formatCurrency} stroke="#475569" />
        <Tooltip
          formatter={(value: number, name: string) => {
            const displayNames: { [key: string]: string } = {
                totalRevenue: 'Total Revenue',
                netBurn: 'Net Burn',
                mrr: 'MRR'
            };
            return [value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), displayNames[name]];
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="totalRevenue" name="Total Revenue" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="mrr" name="MRR" stroke="#10b981" strokeWidth={2} />
        <Line type="monotone" dataKey="netBurn" name="Net Burn" stroke="#ef4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BusinessPerformanceChart;
