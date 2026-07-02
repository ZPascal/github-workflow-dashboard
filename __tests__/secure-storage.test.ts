// __tests__/secure-storage.test.ts
import {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  isSecureStorageAvailable,
  STORAGE_KEYS,
} from '@/lib/storage/secure-storage';

// ---------- localStorage mock ----------
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn((key: string) => { delete store[key]; }),
};

// ---------- SubtleCrypto mock ----------
// encrypt: prepends a 1-byte marker (0xAB) so we can detect "encrypted" data
// decrypt: strips that marker
const subtleMock = {
  digest: jest.fn(async (_algo: string, data: ArrayBuffer) => data), // identity hash
  importKey: jest.fn(async () => ({ type: 'raw' })),
  deriveKey: jest.fn(async () => ({ type: 'derived' })),
  encrypt: jest.fn(async (_algo: unknown, _key: unknown, data: ArrayBuffer) => {
    const input = new Uint8Array(data);
    const output = new Uint8Array(input.length + 1);
    output[0] = 0xab;
    output.set(input, 1);
    return output.buffer;
  }),
  decrypt: jest.fn(async (_algo: unknown, _key: unknown, data: ArrayBuffer) => {
    const input = new Uint8Array(data);
    // strip the leading 0xAB marker
    return input.slice(1).buffer;
  }),
};

const cryptoMock = {
  subtle: subtleMock,
  getRandomValues: jest.fn(<T extends ArrayBufferView>(arr: T): T => {
    // fill with deterministic values for reproducible tests
    if (arr instanceof Uint8Array) arr.fill(0x42);
    return arr;
  }),
};

beforeAll(() => {
  // In jsdom, window === global, so we assign directly rather than redefining
  Object.defineProperty(window, 'crypto', {
    value: cryptoMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'jest', language: 'en' },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, 'screen', {
    value: { width: 1920, height: 1080 },
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  // clear the in-memory store and reset call counts
  Object.keys(store).forEach(k => delete store[k]);
  jest.clearAllMocks();
  // re-wire getItem/setItem/removeItem since clearAllMocks resets implementations
  localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null);
  localStorageMock.setItem.mockImplementation((key: string, value: string) => { store[key] = value; });
  localStorageMock.removeItem.mockImplementation((key: string) => { delete store[key]; });
});

describe('setSecureItem / getSecureItem', () => {
  it('round-trip: stored value is returned unchanged', async () => {
    await setSecureItem('test-key', 'hello-world');
    const result = await getSecureItem('test-key');
    expect(result).toBe('hello-world');
  });

  it('returns null for a key that was never set', async () => {
    const result = await getSecureItem('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null and removes the key when stored data is corrupted', async () => {
    store['bad-key'] = 'not-valid-json{{{';
    const result = await getSecureItem('bad-key');
    expect(result).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('bad-key');
  });
});

describe('removeSecureItem', () => {
  it('removes the key from localStorage', async () => {
    await setSecureItem('to-remove', 'value');
    removeSecureItem('to-remove');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('to-remove');
  });
});

describe('isSecureStorageAvailable', () => {
  it('returns true when crypto and localStorage are present', () => {
    expect(isSecureStorageAvailable()).toBe(true);
  });
});

describe('STORAGE_KEYS', () => {
  it('contains GITHUB_BASE_URL', () => {
    expect(STORAGE_KEYS.GITHUB_BASE_URL).toBeDefined();
    expect(typeof STORAGE_KEYS.GITHUB_BASE_URL).toBe('string');
  });

  it('contains all expected keys', () => {
    const keys = Object.keys(STORAGE_KEYS);
    expect(keys).toContain('GITHUB_TOKEN');
    expect(keys).toContain('GITHUB_USER_ID');
    expect(keys).toContain('SELECTED_REPOSITORIES');
    expect(keys).toContain('GITHUB_BASE_URL');
  });
});
