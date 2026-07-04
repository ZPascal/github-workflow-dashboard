import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session/middleware';
import { getToken } from '@/lib/db/users';
import { GITHUB_DEFAULT_BASE_URL } from '@/lib/api/github';

export async function GET(req: NextRequest) {
  const githubUserId = getSessionUser(req);
  if (!githubUserId) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 });
  }
  const tokenData = getToken(githubUserId);
  return NextResponse.json({
    userId: githubUserId,
    baseUrl: tokenData?.baseUrl ?? GITHUB_DEFAULT_BASE_URL,
  });
}
