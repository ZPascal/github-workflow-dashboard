import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session/middleware';
import { getSettings, saveSettings } from '@/lib/db/users';

export async function GET(req: NextRequest) {
  const githubUserId = getSessionUser(req);
  if (!githubUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const settings = getSettings(githubUserId);
  return NextResponse.json(settings ?? {});
}

export async function PUT(req: NextRequest) {
  const githubUserId = getSessionUser(req);
  if (!githubUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  saveSettings(githubUserId, body);
  return NextResponse.json({ ok: true });
}
