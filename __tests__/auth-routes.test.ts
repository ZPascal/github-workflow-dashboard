/**
 * @jest-environment node
 */
process.env.GWD_ENCRYPTION_KEY = 'a'.repeat(64);

// Mock DB modules so no real SQLite is needed
jest.mock('../src/lib/db/users', () => ({
  storeToken: jest.fn(),
  getToken: jest.fn(),
  getSettings: jest.fn().mockReturnValue(null),
  saveSettings: jest.fn(),
}));

jest.mock('../src/lib/db/sessions', () => ({
  createSession: jest.fn().mockReturnValue('test-session-id'),
  validateSession: jest.fn(),
  deleteSession: jest.fn(),
}));

jest.mock('../src/lib/session/middleware', () => ({
  getSessionUser: jest.fn(),
}));

// Mock fetch for GitHub token validation
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.MockedFunction<typeof fetch>;

import { NextRequest } from 'next/server';
import { POST as loginPOST } from '../src/app/api/auth/login/route';
import { POST as logoutPOST } from '../src/app/api/auth/logout/route';
import { GET as sessionGET } from '../src/app/api/auth/session/route';
import { storeToken, getToken } from '../src/lib/db/users';
import { createSession, validateSession, deleteSession } from '../src/lib/db/sessions';
import { getSessionUser } from '../src/lib/session/middleware';

const mockStoreToken = storeToken as jest.MockedFunction<typeof storeToken>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;
const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>;
const mockDeleteSession = deleteSession as jest.MockedFunction<typeof deleteSession>;
const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>;

function makeRequest(method: string, body?: object, cookies?: Record<string, string>): NextRequest {
  const req = new NextRequest('http://localhost/api/auth/login', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  });
  if (cookies) {
    Object.entries(cookies).forEach(([k, v]) => {
      req.cookies.set(k, v);
    });
  }
  return req;
}

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when token is missing', async () => {
    const res = await loginPOST(makeRequest('POST', {}));
    expect(res.status).toBe(400);
  });

  it('returns 401 when GitHub rejects the token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const res = await loginPOST(makeRequest('POST', { token: 'bad' }));
    expect(res.status).toBe(401);
  });

  it('stores token and returns userId + Set-Cookie on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ login: 'octocat' }),
    });
    mockCreateSession.mockReturnValueOnce('test-session-id');
    const res = await loginPOST(makeRequest('POST', { token: 'ghp_good', baseUrl: 'https://api.github.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: 'octocat', baseUrl: 'https://api.github.com' });
    expect(mockStoreToken).toHaveBeenCalledWith('octocat', 'ghp_good', 'https://api.github.com');
    expect(mockCreateSession).toHaveBeenCalledWith('octocat');
    expect(res.headers.get('set-cookie')).toMatch(/gwd_session=test-session-id/);
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes session and clears cookie', async () => {
    mockValidateSession.mockReturnValueOnce('octocat');
    const req = makeRequest('POST', undefined, { gwd_session: 'abc' });
    const res = await logoutPOST(req);
    expect(res.status).toBe(200);
    expect(mockDeleteSession).toHaveBeenCalledWith('abc');
    expect(res.headers.get('set-cookie')).toMatch(/gwd_session=;/);
  });

  it('returns 200 even with no session cookie', async () => {
    const res = await logoutPOST(makeRequest('POST'));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/session', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockReturnValueOnce(null);
    const req = makeRequest('GET', undefined, { gwd_session: 'bad' });
    const res = await sessionGET(req);
    expect(res.status).toBe(401);
  });

  it('returns userId and baseUrl for valid session', async () => {
    mockGetSessionUser.mockReturnValueOnce('octocat');
    mockGetToken.mockReturnValueOnce({ token: 'ghp_x', baseUrl: 'https://api.github.com' });
    const req = makeRequest('GET', undefined, { gwd_session: 'good' });
    const res = await sessionGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: 'octocat', baseUrl: 'https://api.github.com' });
  });
});
