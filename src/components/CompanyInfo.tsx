import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function CompanyInfo({ data }) {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold tracking-tight">Company Information</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Name</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.Name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Industry</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.Industry}</p>
          </CardContent>
        </Card>
        {/* More company info fields */}
      </div>
    </div>
  );
}
