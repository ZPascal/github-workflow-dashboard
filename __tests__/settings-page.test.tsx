// __tests__/settings-page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GITHUB_DEFAULT_BASE_URL } from '@/lib/api/github';

// --- context mocks ---
const mockSetToken = jest.fn();
const mockRemoveToken = jest.fn();
const mockToggleTheme = jest.fn();
const mockToggleCompactMode = jest.fn();
const mockSetRefreshInterval = jest.fn();
const mockSetDashboardName = jest.fn();
const mockUpdateSettings = jest.fn();

const defaultTokenContext = {
  isValidated: false,
  isLoading: false,
  error: null,
  userId: null,
  baseUrl: GITHUB_DEFAULT_BASE_URL,
  setToken: mockSetToken,
  removeToken: mockRemoveToken,
};

// Use a mutable ref so individual tests can override the context value
let currentTokenContext = { ...defaultTokenContext };

jest.mock('@/contexts/github-token-context', () => ({
  useGitHubToken: () => currentTokenContext,
}));

jest.mock('@/contexts/theme-context', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: mockToggleTheme }),
}));

jest.mock('@/contexts/display-settings-context', () => ({
  useDisplaySettings: () => ({
    settings: { compactMode: false, refreshInterval: 120, dashboardName: 'GitHub Workflow Dashboard' },
    updateSettings: mockUpdateSettings,
    toggleCompactMode: mockToggleCompactMode,
    setRefreshInterval: mockSetRefreshInterval,
    getRefreshIntervalLabel: (v: number) => `${v}s`,
    setDashboardName: mockSetDashboardName,
  }),
  REFRESH_INTERVALS: [
    { value: 30, label: '30 seconds' },
    { value: 120, label: '2 minutes' },
  ],
}));

// RepositorySelection is a child component — mock the whole module
jest.mock('@/components/repository-selection', () => ({
  RepositorySelection: () => <div data-testid="repository-selection" />,
}));

// Also mock repository-selection-context used inside RepositorySelection
jest.mock('@/contexts/repository-selection-context', () => ({
  useRepositorySelection: () => ({
    selectedRepositories: [],
    availableRepositories: [],
    filteredRepositories: [],
    organizations: [],
    selectedOrganization: null,
    isLoading: false,
    isLoadingOrganizations: false,
    error: null,
    loadingStatus: null,
    nameFilter: '',
    fetchRepositories: jest.fn(),
    fetchOrganizations: jest.fn(),
    setSelectedOrganization: jest.fn(),
    toggleRepository: jest.fn(),
    setSelectedRepositories: jest.fn(),
    clearSelection: jest.fn(),
    setNameFilter: jest.fn(),
    clearFilter: jest.fn(),
  }),
}));

import SettingsPage from '@/app/settings/page';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset context to defaults before each test
  currentTokenContext = { ...defaultTokenContext };
});

describe('SettingsPage', () => {
  it('renders the token input form when no token is set', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText(/GitHub Personal Access Token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Token/i })).toBeInTheDocument();
  });

  it('renders the GitHub API URL card with default placeholder', () => {
    render(<SettingsPage />);
    const input = screen.getByLabelText(/API Base URL/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe(GITHUB_DEFAULT_BASE_URL);
    expect(input.value).toBe(GITHUB_DEFAULT_BASE_URL);
  });

  it('Reset button is not shown when using the default URL', () => {
    render(<SettingsPage />);
    expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();
  });

  it('Reset button is shown when baseUrl differs from default', () => {
    // Override the context to simulate a custom baseUrl being set
    currentTokenContext = { ...defaultTokenContext, baseUrl: 'https://ghe.example.com/api/v3' };
    render(<SettingsPage />);
    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    expect(resetBtn).toBeInTheDocument();
  });
});
