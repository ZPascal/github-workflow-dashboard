import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session/middleware';
import { getToken } from '@/lib/db/users';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyRequest(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const githubUserId = getSessionUser(req);
  if (!githubUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenData = getToken(githubUserId);
  if (!tokenData) {
    return NextResponse.json({ error: 'Token not found' }, { status: 500 });
  }

  const { path } = await context.params;
  const url = new URL(req.url);
  const githubUrl = `${tokenData.baseUrl}/${path.join('/')}${url.search}`;

  const upstreamRes = await fetch(githubUrl, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${tokenData.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: ['POST', 'PATCH', 'PUT'].includes(req.method) ? req.body : undefined,
  });

  const responseHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
