// __tests__/token-validation.test.ts
import { validateGitHubToken, isValidTokenFormat } from '@/lib/api/token-validation';
import { GitHubApiClient } from '@/lib/api/github';

jest.mock('../src/lib/api/github');

const MockedGitHubApiClient = GitHubApiClient as jest.MockedClass<typeof GitHubApiClient>;

beforeEach(() => {
  MockedGitHubApiClient.mockClear();
});

describe('validateGitHubToken', () => {
  it('returns isValid: true with user data for a valid token', async () => {
    const mockUser = { login: 'octocat', id: 1, avatar_url: 'https://example.com/a.png', name: 'Octocat', email: null, public_repos: 0, public_gists: 0, followers: 0, following: 0, created_at: '' };
    MockedGitHubApiClient.prototype.validateToken = jest.fn().mockResolvedValue(mockUser);

    const result = await validateGitHubToken('ghp_validtoken12345678901234567890123456');
    expect(result.isValid).toBe(true);
    expect(result.user).toEqual({ login: 'octocat', name: 'Octocat', avatar_url: 'https://example.com/a.png' });
    expect(result.error).toBeUndefined();
  });

  it('returns isValid: false with error message when API throws', async () => {
    MockedGitHubApiClient.prototype.validateToken = jest.fn().mockRejectedValue(new Error('Bad credentials'));

    const result = await validateGitHubToken('ghp_badtoken1234567890123456789012345678');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Bad credentials');
    expect(result.user).toBeUndefined();
  });

  it('short-circuits with error for empty token without calling the API', async () => {
    const result = await validateGitHubToken('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Token is required');
    expect(MockedGitHubApiClient).not.toHaveBeenCalled();
  });

  it('short-circuits with error for whitespace-only token', async () => {
    const result = await validateGitHubToken('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Token is required');
    expect(MockedGitHubApiClient).not.toHaveBeenCalled();
  });

  it('passes baseUrl to GitHubApiClient constructor when provided', async () => {
    MockedGitHubApiClient.prototype.validateToken = jest.fn().mockResolvedValue({ login: 'u', id: 1, avatar_url: '', name: null, email: null, public_repos: 0, public_gists: 0, followers: 0, following: 0, created_at: '' });
    await validateGitHubToken('ghp_token12345678901234567890123456789', 'https://ghe.example.com/api/v3');
    expect(MockedGitHubApiClient).toHaveBeenCalledWith('ghp_token12345678901234567890123456789', 'https://ghe.example.com/api/v3');
  });
});

describe('isValidTokenFormat', () => {
  it('accepts ghp_ prefix token of sufficient length', () => {
    expect(isValidTokenFormat('ghp_' + 'a'.repeat(36))).toBe(true);
  });

  it('accepts ghs_ prefix token of sufficient length', () => {
    expect(isValidTokenFormat('ghs_' + 'b'.repeat(36))).toBe(true);
  });

  it('accepts classic 40-char lowercase hex token', () => {
    expect(isValidTokenFormat('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidTokenFormat('')).toBe(false);
  });

  it('rejects ghp_ token that is too short', () => {
    expect(isValidTokenFormat('ghp_short')).toBe(false);
  });

  it('rejects classic token with non-hex characters', () => {
    expect(isValidTokenFormat('z1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')).toBe(false);
  });

  it('rejects non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(isValidTokenFormat(null)).toBe(false);
  });
});
