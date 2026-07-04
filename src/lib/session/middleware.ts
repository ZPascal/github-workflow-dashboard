import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/db/sessions';

export function getSessionUser(req: NextRequest): string | null {
  const sessionId = req.cookies.get('gwd_session')?.value;
  if (!sessionId) return null;
  return validateSession(sessionId);
}
