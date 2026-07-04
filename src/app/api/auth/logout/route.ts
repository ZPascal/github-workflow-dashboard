import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db/sessions';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('gwd_session')?.value;
  if (sessionId) {
    deleteSession(sessionId);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('gwd_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
