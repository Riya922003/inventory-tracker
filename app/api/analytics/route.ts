import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const projectId = process.env.VERCEL_PROJECT_ID || process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing VERCEL_PROJECT_ID environment variable' },
        { status: 500 }
      );
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const queries = [
      { dimension: 'country' },
      { dimension: 'region' },
      { dimension: 'city' },
      { dimension: 'os' },
      { dimension: 'browser' },
    ];

    const results = await Promise.all(
      queries.map(async ({ dimension }) => {
        const url = `https://va.vercel-scripts.com/v1/projects/${projectId}/stats?dimension=${dimension}&start=${startDate.getTime()}&end=${endDate.getTime()}`;
        
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${dimension}:`, response.status, response.statusText);
          return { dimension, data: [] };
        }

        const data = await response.json();
        return { dimension, data: data.data || [] };
      })
    );

    const analyticsData = results.reduce((acc, { dimension, data }) => {
      acc[dimension] = data;
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
