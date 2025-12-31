'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  country: Array<{ name: string; value: number }>;
  region: Array<{ name: string; value: number }>;
  city: Array<{ name: string; value: number }>;
  os: Array<{ name: string; value: number }>;
  browser: Array<{ name: string; value: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Analytics - Last 7 Days</h1>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Analytics - Last 7 Days</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics - Last 7 Days</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.country?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{item.name || 'Unknown'}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
              {(!data?.country || data.country.length === 0) && (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regions (States)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.region?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{item.name || 'Unknown'}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
              {(!data?.region || data.region.length === 0) && (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.city?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{item.name || 'Unknown'}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
              {(!data?.city || data.city.length === 0) && (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.os?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{item.name || 'Unknown'}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
              {(!data?.os || data.os.length === 0) && (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {data?.browser?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm">{item.name || 'Unknown'}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
              {(!data?.browser || data.browser.length === 0) && (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
