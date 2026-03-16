import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

export async function GET() {
  try {
    const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Health check failed' },
      { status: 502 }
    );
  }
}
