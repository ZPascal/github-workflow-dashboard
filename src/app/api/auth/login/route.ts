import { NextRequest, NextResponse } from 'next/server';
import { storeToken } from '@/lib/db/users';
import { createSession } from '@/lib/db/sessions';
import { GITHUB_DEFAULT_BASE_URL } from '@/lib/api/github';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, baseUrl } = body as { token?: string; baseUrl?: string };

  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const resolvedBaseUrl = (baseUrl || GITHUB_DEFAULT_BASE_URL).replace(/\/$/, '');

  // Validate token against GitHub
  const validation = await fetch(`${resolvedBaseUrl}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  }).catch(() => null);

  if (!validation?.ok) {
    return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 401 });
  }

  const user = await validation.json();
  const githubUserId: string = user.login;

  storeToken(githubUserId, token, resolvedBaseUrl);
  const sessionId = createSession(githubUserId);

  const res = NextResponse.json({ userId: githubUserId, baseUrl: resolvedBaseUrl });
  res.cookies.set('gwd_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  });
  return res;
}
