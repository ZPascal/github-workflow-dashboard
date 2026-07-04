'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const REFRESH_INTERVALS = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
] as const;

type RefreshInterval = typeof REFRESH_INTERVALS[number]['value'];

export interface DisplaySettings {
  compactMode: boolean;
  refreshInterval: RefreshInterval;
  dashboardName: string;
}

interface DisplaySettingsContextType {
  settings: DisplaySettings;
  updateSettings: (updates: Partial<DisplaySettings>) => void;
  toggleCompactMode: () => void;
  setRefreshInterval: (interval: RefreshInterval) => void;
  getRefreshIntervalLabel: (interval: RefreshInterval) => string;
  setDashboardName: (name: string) => void;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  compactMode: false,
  refreshInterval: 120,
  dashboardName: 'GitHub Workflow Dashboard',
};

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined);

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) throw new Error('useDisplaySettings must be used within DisplaySettingsProvider');
  return context;
}

async function fetchSettings(): Promise<Partial<DisplaySettings>> {
  const res = await fetch('/api/settings').catch(() => null);
  if (!res?.ok) return {};
  const all = await res.json();
  const { compactMode, refreshInterval, dashboardName } = all;
  return { compactMode, refreshInterval, dashboardName };
}

async function persistSettings(settings: DisplaySettings): Promise<void> {
  // Merge with full settings blob to avoid clobbering selectedRepos etc.
  const res = await fetch('/api/settings').catch(() => null);
  const current = res?.ok ? await res.json().catch(() => ({})) : {};
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...current, ...settings }),
  }).catch(() => { });
}

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchSettings().then((saved) => {
      if (Object.keys(saved).length > 0) {
        setSettings((prev) => ({ ...prev, ...saved }));
      }
    });
  }, []);

  const updateSettings = (updates: Partial<DisplaySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

  const toggleCompactMode = () => updateSettings({ compactMode: !settings.compactMode });
  const setRefreshInterval = (interval: RefreshInterval) => updateSettings({ refreshInterval: interval });
  const setDashboardName = (name: string) => updateSettings({ dashboardName: name });
  const getRefreshIntervalLabel = (interval: RefreshInterval) =>
    REFRESH_INTERVALS.find((i) => i.value === interval)?.label ?? `${interval} seconds`;

  return (
    <DisplaySettingsContext.Provider value={{ settings, updateSettings, toggleCompactMode, setRefreshInterval, getRefreshIntervalLabel, setDashboardName }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}
