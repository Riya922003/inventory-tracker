import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.VERCEL_ANALYTICS_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token || !teamId || !projectId) {
      return NextResponse.json(
        { error: 'Missing Vercel Analytics configuration' },
        { status: 500 }
      );
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const queries = [
      { dimension: 'country', metric: 'visitors' },
      { dimension: 'region', metric: 'visitors' },
      { dimension: 'city', metric: 'visitors' },
      { dimension: 'os', metric: 'visitors' },
      { dimension: 'browser', metric: 'visitors' },
    ];

    const results = await Promise.all(
      queries.map(async ({ dimension, metric }) => {
        const url = `https://vercel.com/api/web/insights/stats?teamId=${teamId}&projectId=${projectId}&from=${startDate.getTime()}&to=${endDate.getTime()}&dimension=${dimension}&metric=${metric}`;
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${dimension} data`);
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
