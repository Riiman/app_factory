import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function GTMStrategy({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">GTM Strategy</h2>
      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Marketing Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.MarketingChannels?.join(', ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.SalesStrategy}</p>
          </CardContent>
        </Card>
        {/* More GTM fields */}
      </div>
    </div>
  );
}
