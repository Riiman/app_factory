import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function Products({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">Products/Services</h2>
      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Name</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.Name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.Description}</p>
          </CardContent>
        </Card>
        {/* More product fields */}
      </div>
    </div>
  );
}
