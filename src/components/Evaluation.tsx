import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function Evaluation({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">Evaluation</h2>
      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Problem</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.Problem}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Solution</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.Solution}</p>
          </CardContent>
        </Card>
        {/* More evaluation fields */}
      </div>
    </div>
  );
}
