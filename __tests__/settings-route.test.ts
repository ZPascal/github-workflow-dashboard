/**
 * @jest-environment node
 */
process.env.GWD_ENCRYPTION_KEY = 'a'.repeat(64);

jest.mock('../src/lib/db/users', () => ({
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  storeToken: jest.fn(),
  getToken: jest.fn(),
}));

jest.mock('../src/lib/db/sessions', () => ({
  validateSession: jest.fn(),
  createSession: jest.fn(),
  deleteSession: jest.fn(),
}));

jest.mock('../src/lib/session/middleware', () => ({
  getSessionUser: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PUT } from '../src/app/api/settings/route';
import { getSettings, saveSettings } from '../src/lib/db/users';
import { getSessionUser } from '../src/lib/session/middleware';

const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
const mockSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;
const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>;

function makeReq(method: string, body?: object, cookies?: Record<string, string>) {
  const req = new NextRequest('http://localhost/api/settings', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  });
  if (cookies) Object.entries(cookies).forEach(([k, v]) => req.cookies.set(k, v));
  return req;
}

describe('GET /api/settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockReturnValueOnce(null);
    const res = await GET(makeReq('GET', undefined, { gwd_session: 'bad' }));
    expect(res.status).toBe(401);
  });

  it('returns empty object when no settings stored', async () => {
    mockGetSessionUser.mockReturnValueOnce('octocat');
    mockGetSettings.mockReturnValueOnce(null);
    const res = await GET(makeReq('GET', undefined, { gwd_session: 'good' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it('returns stored settings', async () => {
    mockGetSessionUser.mockReturnValueOnce('octocat');
    mockGetSettings.mockReturnValueOnce({ compactMode: true });
    const res = await GET(makeReq('GET', undefined, { gwd_session: 'good' }));
    expect(await res.json()).toEqual({ compactMode: true });
  });
});

describe('PUT /api/settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockReturnValueOnce(null);
    const res = await PUT(makeReq('PUT', { compactMode: true }, { gwd_session: 'bad' }));
    expect(res.status).toBe(401);
  });

  it('persists settings and returns 200', async () => {
    mockGetSessionUser.mockReturnValueOnce('octocat');
    const res = await PUT(makeReq('PUT', { compactMode: true }, { gwd_session: 'good' }));
    expect(res.status).toBe(200);
    expect(mockSaveSettings).toHaveBeenCalledWith('octocat', { compactMode: true });
  });
});
