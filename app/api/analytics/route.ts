import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.VERCEL_ACCESS_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing VERCEL_ACCESS_TOKEN. Create one at: https://vercel.com/account/tokens' },
        { status: 500 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing VERCEL_PROJECT_ID' },
        { status: 500 }
      );
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const baseUrl = teamId 
      ? `https://vercel.com/api/web/insights/${teamId}/${projectId}/views`
      : `https://vercel.com/api/web/insights/views`;

    const params = new URLSearchParams({
      projectId,
      from: startDate.getTime().toString(),
      to: endDate.getTime().toString(),
    });

    const dimensions = ['country', 'region', 'city', 'os', 'browser'];
    
    const results = await Promise.all(
      dimensions.map(async (dimension) => {
        const url = `${baseUrl}?${params}&dimension=${dimension}`;
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${dimension}:`, response.status, await response.text());
          return { dimension, data: [] };
        }

        const result = await response.json();
        return { dimension, data: result.data || [] };
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
      { error: 'Failed to fetch analytics data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
