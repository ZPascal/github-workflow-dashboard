'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GITHUB_DEFAULT_BASE_URL } from '@/lib/api/github';

interface GitHubTokenContextType {
  isValidated: boolean;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  baseUrl: string;
  setToken: (token: string, baseUrl?: string) => Promise<void>;
  removeToken: () => Promise<void>;
}

const GitHubTokenContext = createContext<GitHubTokenContextType | undefined>(undefined);

export function GitHubTokenProvider({ children }: { children: ReactNode }) {
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(GITHUB_DEFAULT_BASE_URL);

  // On mount, check for an existing session
  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUserId(data.userId);
          setBaseUrl(data.baseUrl ?? GITHUB_DEFAULT_BASE_URL);
          setIsValidated(true);
        }
      })
      .catch(() => { /* no session, stay logged out */ })
      .finally(() => setIsLoading(false));
  }, []);

  const setToken = async (token: string, newBaseUrl?: string): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, baseUrl: newBaseUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Login failed');
      }
      const data = await res.json();
      setUserId(data.userId);
      setBaseUrl(data.baseUrl ?? GITHUB_DEFAULT_BASE_URL);
      setIsValidated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const removeToken = async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
    setIsValidated(false);
    setUserId(null);
    setBaseUrl(GITHUB_DEFAULT_BASE_URL);
    setError(null);
  };

  // Listen for 401 responses from the API proxy and reset auth state
  const removeTokenRef = React.useRef(removeToken);
  removeTokenRef.current = removeToken;

  useEffect(() => {
    const handleUnauthorized = () => removeTokenRef.current();
    window.addEventListener('gwd:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('gwd:unauthorized', handleUnauthorized);
  }, []); // empty deps, ref stays current

  return (
    <GitHubTokenContext.Provider value={{ isValidated, isLoading, error, userId, baseUrl, setToken, removeToken }}>
      {children}
    </GitHubTokenContext.Provider>
  );
}

export function useGitHubToken(): GitHubTokenContextType {
  const context = useContext(GitHubTokenContext);
  if (!context) throw new Error('useGitHubToken must be used within GitHubTokenProvider');
  return context;
}
