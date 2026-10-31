import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  const subPath = path && path.length ? '/' + path.join('/') : '';
  const apiUrl = process.env.API_URL || 'http://localhost:4010';
  const targetUrl = `${apiUrl}/api${subPath}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.blob(),
      cache: 'no-store',
      redirect: 'manual',
    });

    const resHeaders = new Headers(res.headers);
    resHeaders.delete('content-encoding');

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, err);
    return NextResponse.json({ message: 'Backend service unavailable', error: err?.message }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
