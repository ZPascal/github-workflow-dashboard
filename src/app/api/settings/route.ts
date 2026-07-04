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
  const body = await req.json();
  saveSettings(githubUserId, body);
  return NextResponse.json({ ok: true });
}
