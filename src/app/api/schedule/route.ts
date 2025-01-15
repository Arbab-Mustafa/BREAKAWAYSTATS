import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api-web.nhle.com/v1/schedule/now', {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch schedule');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}