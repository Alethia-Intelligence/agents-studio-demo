import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  try {
    const { path } = await params;
    const targetPath = path.join('/');
    const url = new URL(`${API_BASE_URL}/${targetPath}`);

    // Preserve query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Build headers — forward Authorization (injected by middleware) and Content-Type
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const contentType = request.headers.get('Content-Type');
    if (contentType) headers['Content-Type'] = contentType;

    const fetchInit: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward request body for non-GET/HEAD methods
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchInit.body = await request.text();
    }

    const response = await fetch(url.toString(), fetchInit);

    // Filter out hop-by-hop headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proxy request' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
