import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function Milestones({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">Milestones</h2>
      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Long Term Vision</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.LongTermVision}</p>
          </CardContent>
        </Card>
        {/* More milestones fields */}
      </div>
    </div>
  );
}
