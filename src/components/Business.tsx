import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function Business({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">Business Details</h2>
      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.FinancialProjections}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>MRR: {data.KeyMetrics?.MonthlyRecurringRevenue}</p>
            <p>Churn Rate: {data.KeyMetrics?.CustomerChurnRate}%</p>
          </CardContent>
        </Card>
        {/* More business fields */}
      </div>
    </div>
  );
}
