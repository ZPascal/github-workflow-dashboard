/**
 * @jest-environment node
 */
process.env.GWD_ENCRYPTION_KEY = 'a'.repeat(64);

jest.mock('../src/lib/db/users', () => ({
  getToken: jest.fn(),
  storeToken: jest.fn(),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
}));

jest.mock('../src/lib/db/sessions', () => ({
  validateSession: jest.fn(),
  createSession: jest.fn(),
  deleteSession: jest.fn(),
}));

jest.mock('../src/lib/session/middleware', () => ({
  getSessionUser: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as jest.MockedFunction<typeof fetch>;

import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/github/[...path]/route';
import { getToken } from '../src/lib/db/users';
import { getSessionUser } from '../src/lib/session/middleware';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>;

function makeProxyRequest(path: string[], cookies?: Record<string, string>) {
  const req = new NextRequest(`http://localhost/api/github/${path.join('/')}`, { method: 'GET' });
  if (cookies) Object.entries(cookies).forEach(([k, v]) => req.cookies.set(k, v));
  return req;
}

describe('GET /api/github/[...path]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no valid session', async () => {
    mockGetSessionUser.mockReturnValueOnce(null);
    const req = makeProxyRequest(['repos', 'owner', 'repo', 'actions', 'runs']);
    const res = await GET(req, { params: Promise.resolve({ path: ['repos', 'owner', 'repo', 'actions', 'runs'] }) });
    expect(res.status).toBe(401);
  });

  it('proxies request to GitHub with Authorization header', async () => {
    mockGetSessionUser.mockReturnValueOnce('octocat');
    mockGetToken.mockReturnValueOnce({ token: 'ghp_secret', baseUrl: 'https://api.github.com' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: new ReadableStream(),
    });

    const req = makeProxyRequest(['repos', 'octocat', 'hello', 'actions', 'runs']);
    await GET(req, { params: Promise.resolve({ path: ['repos', 'octocat', 'hello', 'actions', 'runs'] }) });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/octocat/hello/actions/runs',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ghp_secret' }),
      })
    );
  });
});
