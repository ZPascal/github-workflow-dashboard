/**
 * GitHub Token Context
 * Manages GitHub token state and provides secure storage integration
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setSecureItem, getSecureItem, removeSecureItem, isSecureStorageAvailable, STORAGE_KEYS } from '@/lib/storage/secure-storage';
import { validateGitHubToken } from '@/lib/api/token-validation';
import { GITHUB_DEFAULT_BASE_URL } from '@/lib/api/github';

interface GitHubTokenContextType {
  token: string | null;
  isValidated: boolean;
  isLoading: boolean;
  error: string | null;
  userId?: string | null;
  baseUrl: string;
  setToken: (token: string) => Promise<void>;
  removeToken: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  isSecureStorageSupported: boolean;
  setBaseUrl: (url: string) => Promise<void>;
}

const GitHubTokenContext = createContext<GitHubTokenContextType | undefined>(undefined);

interface GitHubTokenProviderProps {
  children: ReactNode;
}

export function GitHubTokenProvider({ children }: GitHubTokenProviderProps) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSecureStorageSupported, setIsSecureStorageSupported] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [baseUrl, setBaseUrlState] = useState<string>(GITHUB_DEFAULT_BASE_URL);

  // Load baseUrl from storage on mount, falling back to server-injected value
  useEffect(() => {
    async function loadStoredBaseUrl() {
      try {
        const stored = await getSecureItem(STORAGE_KEYS.GITHUB_BASE_URL);
        if (stored) {
          setBaseUrlState(stored);
        }
      } catch {
        // ignore, use default
      }
    }
    loadStoredBaseUrl();
  }, []);

  // Load token from secure storage on mount, falling back to VCAP_SERVICES via /api/config
  useEffect(() => {
    async function loadStoredToken() {
      console.log('[GitHub Token Context] Loading stored token...');

      // Try localStorage first (works in browser; empty after CF container restart)
      const secureAvailable = isSecureStorageAvailable();
      setIsSecureStorageSupported(secureAvailable);

      if (secureAvailable) {
        const storedToken = await getSecureItem(STORAGE_KEYS.GITHUB_TOKEN).catch(() => null);
        console.log('[GitHub Token Context] Stored token found:', !!storedToken);

        if (storedToken) {
          const storedUserId = await getSecureItem(STORAGE_KEYS.GITHUB_USER_ID).catch(() => null);
          if (storedUserId) setUserId(storedUserId);
          setTokenState(storedToken);
          setIsValidated(true);
          setIsLoading(false);
          return;
        }
      }

      // No stored token — try server-injected credentials from VCAP_SERVICES
      console.log('[GitHub Token Context] No stored token, trying /api/config...');
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.token) {
            console.log('[GitHub Token Context] Using server-injected token from VCAP_SERVICES');
            const resolvedUrl = (cfg.apiUrl || baseUrl).replace(/\/$/, '');
            const validation = await validateGitHubToken(cfg.token, resolvedUrl);
            if (validation.isValid) {
              // Persist before setting state — re-check availability here in case
              // isSecureStorageAvailable() returned false during SSR hydration
              try {
                await setSecureItem(STORAGE_KEYS.GITHUB_TOKEN, cfg.token);
                if (resolvedUrl !== GITHUB_DEFAULT_BASE_URL) {
                  await setSecureItem(STORAGE_KEYS.GITHUB_BASE_URL, resolvedUrl);
                }
                setIsSecureStorageSupported(true);
              } catch {
                // storage unavailable — token lives in state only for this session
              }
              setTokenState(cfg.token);
              setBaseUrlState(resolvedUrl);
              setIsValidated(true);
            }
          }
        }
      } catch {
        // ignore — user must enter token manually
      }

      setIsLoading(false);
    }

    loadStoredToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setToken = async (newToken: string): Promise<void> => {
    console.log('[GitHub Token Context] Setting token...');
    setError(null);
    setIsLoading(true);

    try {
      // Validate the token first
      console.log('[GitHub Token Context] Validating token...');
      const validation = await validateGitHubToken(newToken, baseUrl);
      console.log('[GitHub Token Context] Token validation result:', validation);
      
      if (!validation.isValid) {
        console.error('[GitHub Token Context] Token validation failed:', validation.error);
        throw new Error(validation.error || 'Invalid GitHub token');
      }

      // Store the token securely if storage is available
      if (isSecureStorageSupported) {
        console.log('[GitHub Token Context] Storing token securely...');
        await setSecureItem(STORAGE_KEYS.GITHUB_TOKEN, newToken);
      } else {
        console.log('[GitHub Token Context] Secure storage not available, token will not persist');
      }

      setTokenState(newToken);
      setIsValidated(true);
      // Fetch authenticated user id and store it
      try {
        const apiBase = (baseUrl || GITHUB_DEFAULT_BASE_URL).replace(/\/$/, '');
        const res = await fetch(`${apiBase}/user`, {
          headers: {
            Authorization: `Bearer ${newToken}`,
            Accept: 'application/vnd.github+json'
          }
        });

        if (!res.ok) {
          console.warn('[GitHub Token Context] Failed to fetch user info', res.status);
        } else {
          const data = await res.json();
          const login = data && (data.login || data.id);
          if (login) {
            setUserId(login);
            if (isSecureStorageSupported) {
              await setSecureItem(STORAGE_KEYS.GITHUB_USER_ID, login);
            }
          }
        }
      } catch (err) {
        console.warn('[GitHub Token Context] Error fetching user info', err);
      }
      console.log('[GitHub Token Context] Token successfully set and validated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set token';
      console.error('[GitHub Token Context] Error setting token:', err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeToken = async (): Promise<void> => {
    setError(null);
    
    try {
      if (isSecureStorageSupported) {
        await removeSecureItem(STORAGE_KEYS.GITHUB_TOKEN);
        await removeSecureItem(STORAGE_KEYS.GITHUB_USER_ID);
      }
      
      setTokenState(null);
      setUserId(null);
      setIsValidated(false);
    } catch (err) {
      console.error('Failed to remove token:', err);
      setError('Failed to remove token');
    }
  };

  const validateToken = async (): Promise<boolean> => {
    if (!token) {
      setIsValidated(false);
      return false;
    }

    setError(null);
    setIsLoading(true);

    try {
      const validation = await validateGitHubToken(token, baseUrl);
      setIsValidated(validation.isValid);

      if (!validation.isValid) {
        setError(validation.error || 'Token validation failed');
      }

      return validation.isValid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token validation failed';
      setError(message);
      setIsValidated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const setBaseUrl = async (url: string): Promise<void> => {
    const normalized = url.trim().replace(/\/$/, '') || GITHUB_DEFAULT_BASE_URL;
    setBaseUrlState(normalized);
    try {
      if (isSecureStorageSupported) {
        if (normalized === GITHUB_DEFAULT_BASE_URL) {
          removeSecureItem(STORAGE_KEYS.GITHUB_BASE_URL);
        } else {
          await setSecureItem(STORAGE_KEYS.GITHUB_BASE_URL, normalized);
        }
      }
    } catch {
      // ignore storage errors
    }
  };

  const contextValue: GitHubTokenContextType = {
    token,
    isValidated,
    isLoading,
    error,
    userId,
    baseUrl,
    setToken,
    removeToken,
    validateToken,
    isSecureStorageSupported,
    setBaseUrl,
  };

  return (
    <GitHubTokenContext.Provider value={contextValue}>
      {children}
    </GitHubTokenContext.Provider>
  );
}

export function useGitHubToken(): GitHubTokenContextType {
  const context = useContext(GitHubTokenContext);
  if (context === undefined) {
    throw new Error('useGitHubToken must be used within a GitHubTokenProvider');
  }
  return context;
}