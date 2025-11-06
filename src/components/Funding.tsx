import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function Funding({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">Funding Details</h2>
      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Amount Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <p>${data.AmountRaised?.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>${data.CurrentValuation?.toLocaleString()}</p>
          </CardContent>
        </Card>
        {/* More funding fields */}
      </div>
    </div>
  );
}
