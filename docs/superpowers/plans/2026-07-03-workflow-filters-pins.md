# Workflow Name Filter & Pin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a workflow name filter input and per-card pin button to the dashboard, with both persisted to localStorage.

**Architecture:** Two new fields (`workflowNameFilter`, `pinnedWorkflows`) are added to `DisplaySettings` in `display-settings-context.tsx` and persisted alongside existing settings. `workflow-dashboard.tsx` reads them to filter and sort workflows, and renders the new UI controls. All logic is client-side — no API changes.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind CSS, Lucide React, Jest 30 + React Testing Library

---

## File Map

- **Modify:** `src/contexts/display-settings-context.tsx` — add two fields and two methods
- **Modify:** `src/components/workflow-dashboard.tsx` — filter input in toolbar, pin button on cards, updated sort logic
- **Modify:** `__tests__/settings-page.test.tsx` — update mock to include new context fields

---

### Task 1: Extend DisplaySettings with filter and pin fields

**Files:**
- Modify: `src/contexts/display-settings-context.tsx`
- Modify: `__tests__/settings-page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/settings-page.test.tsx` — update the `useDisplaySettings` mock to include the new fields (this makes tests fail if the context doesn't export them):

```typescript
// In the jest.mock('@/contexts/display-settings-context', ...) factory,
// update the useDisplaySettings return value to:
jest.mock('@/contexts/display-settings-context', () => ({
  useDisplaySettings: () => ({
    settings: {
      compactMode: false,
      refreshInterval: 120,
      dashboardName: 'GitHub Workflow Dashboard',
      workflowNameFilter: '',
      pinnedWorkflows: [],
    },
    updateSettings: mockUpdateSettings,
    toggleCompactMode: mockToggleCompactMode,
    setRefreshInterval: mockSetRefreshInterval,
    getRefreshIntervalLabel: (v: number) => `${v}s`,
    setDashboardName: mockSetDashboardName,
    setWorkflowNameFilter: jest.fn(),
    togglePinnedWorkflow: jest.fn(),
  }),
  REFRESH_INTERVALS: [
    { value: 30, label: '30 seconds' },
    { value: 120, label: '2 minutes' },
  ],
}));
```

- [ ] **Step 2: Run tests to verify they still pass (mock update is non-breaking)**

```bash
npm test -- --testPathPattern=settings-page --no-coverage
```

Expected: all 5 tests pass (mock addition is additive).

- [ ] **Step 3: Update `DisplaySettings` interface and `DEFAULT_SETTINGS`**

Replace the interface and default in `src/contexts/display-settings-context.tsx`:

```typescript
interface DisplaySettings {
  compactMode: boolean;
  refreshInterval: RefreshInterval;
  dashboardName: string;
  workflowNameFilter: string;
  pinnedWorkflows: string[];
}

const DEFAULT_SETTINGS: DisplaySettings = {
  compactMode: false,
  refreshInterval: 120,
  dashboardName: 'GitHub Workflow Dashboard',
  workflowNameFilter: '',
  pinnedWorkflows: [],
};
```

- [ ] **Step 4: Add methods to context type and provider**

Replace `DisplaySettingsContextType` and add the two new methods to the provider:

```typescript
interface DisplaySettingsContextType {
  settings: DisplaySettings;
  updateSettings: (updates: Partial<DisplaySettings>) => void;
  toggleCompactMode: () => void;
  setRefreshInterval: (interval: RefreshInterval) => void;
  getRefreshIntervalLabel: (interval: RefreshInterval) => string;
  setDashboardName: (name: string) => void;
  setWorkflowNameFilter: (filter: string) => void;
  togglePinnedWorkflow: (name: string) => void;
}
```

Add the two implementations inside `DisplaySettingsProvider`, before the `return`:

```typescript
const setWorkflowNameFilter = (filter: string) => {
  updateSettings({ workflowNameFilter: filter });
};

const togglePinnedWorkflow = (name: string) => {
  const pinned = settings.pinnedWorkflows;
  const next = pinned.includes(name)
    ? pinned.filter(n => n !== name)
    : [...pinned, name];
  updateSettings({ pinnedWorkflows: next });
};
```

Update the Provider `value` prop:

```tsx
<DisplaySettingsContext.Provider
  value={{
    settings,
    updateSettings,
    toggleCompactMode,
    setRefreshInterval,
    getRefreshIntervalLabel,
    setDashboardName,
    setWorkflowNameFilter,
    togglePinnedWorkflow,
  }}
>
  {children}
</DisplaySettingsContext.Provider>
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --no-coverage
```

Expected: 37/37 passing.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/display-settings-context.tsx __tests__/settings-page.test.tsx
git commit -m "feat: add workflowNameFilter and pinnedWorkflows to DisplaySettings"
```

---

### Task 2: Filter input in the dashboard toolbar

**Files:**
- Modify: `src/components/workflow-dashboard.tsx`

- [ ] **Step 1: Add `Pin` and `X` to the Lucide import and destructure new context values**

At the top of `workflow-dashboard.tsx`, update the Lucide import line (currently line 15):

```typescript
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Loader, ExternalLink, Moon, Sun, Monitor, Settings, ZoomIn, ZoomOut, Pin, X } from 'lucide-react';
```

In the `WorkflowDashboard` function body, update the `useDisplaySettings` destructure (currently line 112):

```typescript
const { settings, toggleCompactMode, setRefreshInterval, setWorkflowNameFilter, togglePinnedWorkflow } = useDisplaySettings();
```

- [ ] **Step 2: Add filter input below the toolbar controls**

Find the closing `</div>` of the top controls row (the one that wraps the Only Me checkbox, auto-refresh, icon buttons — ends around line 530). Add the filter input **after** that closing `</div>` and before the status filter cards section:

```tsx
{/* Workflow name filter */}
<div className="relative flex items-center mt-2">
  <input
    type="text"
    value={settings.workflowNameFilter}
    onChange={(e) => setWorkflowNameFilter(e.target.value)}
    placeholder="Filter by workflow name..."
    className="w-full h-8 px-3 pr-8 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
  />
  {settings.workflowNameFilter && (
    <button
      onClick={() => setWorkflowNameFilter('')}
      className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Clear filter"
    >
      <X className="w-4 h-4" />
    </button>
  )}
</div>
```

- [ ] **Step 3: Apply the name filter inside `filterWorkflows`**

The current `filterWorkflows` function starts at line 376. Add the name filter step after the `onlyMe` block and before the `activeFilter` block:

```typescript
const filterWorkflows = (workflows: GitHubWorkflowRun[]) => {
  let filteredWorkflows = workflows;

  if (onlyMe && userId) {
    filteredWorkflows = filteredWorkflows.filter(workflow => {
      const actor = workflow.actor?.login || '';
      const commitAuthor = (workflow.head_commit && (workflow.head_commit.author?.name || workflow.head_commit.author?.email)) || '';
      return actor === userId || commitAuthor === userId;
    });
  }

  if (settings.workflowNameFilter) {
    const lower = settings.workflowNameFilter.toLowerCase();
    filteredWorkflows = filteredWorkflows.filter(w =>
      w.name.toLowerCase().includes(lower)
    );
  }

  if (!activeFilter || activeFilter === 'Total') {
    return filteredWorkflows;
  }

  return filteredWorkflows.filter(workflow => {
    if (workflow.status === activeFilter) return true;
    if (workflow.status === 'completed' && workflow.conclusion === activeFilter) return true;
    return false;
  });
};
```

- [ ] **Step 4: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build, `/api/config` shown as `ƒ (Dynamic)`.

- [ ] **Step 5: Commit**

```bash
git add src/components/workflow-dashboard.tsx
git commit -m "feat: add workflow name filter input to dashboard toolbar"
```

---

### Task 3: Pin button on workflow cards and sort logic

**Files:**
- Modify: `src/components/workflow-dashboard.tsx`

- [ ] **Step 1: Add a `sortWithPins` helper inside `WorkflowDashboard`**

Add this function directly above `filterWorkflows` (around line 374):

```typescript
const sortWithPins = (workflows: GitHubWorkflowRun[]): GitHubWorkflowRun[] => {
  const pinned = settings.pinnedWorkflows;
  if (pinned.length === 0) return workflows;
  const pinnedItems = workflows
    .filter(w => pinned.includes(w.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const unpinned = workflows.filter(w => !pinned.includes(w.name));
  return [...pinnedItems, ...unpinned];
};
```

- [ ] **Step 2: Wrap both `filterWorkflows` call sites with `sortWithPins`**

There are two call sites:

**Compact mode** (around line 620):
```typescript
// Before:
return filterWorkflows(repositoryWorkflow.workflows).length > 0;
// becomes (no change needed for the filter check itself)

// Before (flatMap line ~623):
filterWorkflows(repositoryWorkflow.workflows).map(workflow => ({
// After:
sortWithPins(filterWorkflows(repositoryWorkflow.workflows)).map(workflow => ({
```

**Normal mode** (around line 757):
```typescript
// Before:
{filterWorkflows(repositoryWorkflow.workflows).map((workflow) => {
// After:
{sortWithPins(filterWorkflows(repositoryWorkflow.workflows)).map((workflow) => {
```

Also update the two `.length === 0` checks (compact line ~620, normal line ~703) — they don't need `sortWithPins`, only the `.map` calls do.

- [ ] **Step 3: Add the pin button to the normal-mode workflow card**

Inside the normal-mode card, find the `<div className="flex items-start justify-between gap-3">` that wraps the workflow title and status badge (around line 796). Add the pin button alongside the status badge:

```tsx
<div className="flex items-start justify-between gap-3">
  <div className="flex-1 min-w-0">
    <a
      href={workflow.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-bold hover:text-primary transition-colors ${settings.compactMode ? 'text-base' : 'text-lg'} text-foreground flex items-center gap-2 group`}
    >
      <span className="flex-1 min-w-0">{workflow.name}</span>
      <ExternalLink className={`${settings.compactMode ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
    </a>
  </div>
  <div className="flex items-center gap-1 flex-shrink-0">
    <button
      onClick={(e) => { e.stopPropagation(); togglePinnedWorkflow(workflow.name); }}
      className={`p-1 rounded transition-colors ${
        settings.pinnedWorkflows.includes(workflow.name)
          ? 'text-amber-500 hover:text-amber-600'
          : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground'
      }`}
      title={settings.pinnedWorkflows.includes(workflow.name) ? 'Unpin workflow' : 'Pin to top'}
    >
      <Pin className="w-3.5 h-3.5" />
    </button>
    <WorkflowStatusBadge
      status={workflow.status}
      conclusion={workflow.conclusion}
    />
  </div>
</div>
```

Note: the outer `<div key={workflow.id} className="flex flex-col ...">` needs `group` added to its className for the opacity hover to work:

```tsx
<div
  key={workflow.id}
  className={`group flex flex-col ${settings.compactMode ? 'p-3' : 'p-4'} border rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200 gap-${settings.compactMode ? '2' : '3'} ${borderColor}`}
>
```

- [ ] **Step 4: Add pin button to compact-mode cards**

Inside the compact mode card (the `<div key={...} className="flex flex-col p-2 border rounded-lg ...">` around line 651), add a pin button next to the workflow title link:

```tsx
{/* Workflow title + pin */}
<div className="flex items-start justify-between gap-1">
  <a
    href={workflow.html_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm font-medium hover:text-primary transition-colors text-foreground flex items-center gap-1 group flex-1 min-w-0 truncate"
  >
    <span className="truncate">{workflow.name}</span>
    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
  </a>
  <button
    onClick={(e) => { e.stopPropagation(); togglePinnedWorkflow(workflow.name); }}
    className={`flex-shrink-0 p-0.5 rounded transition-colors ${
      settings.pinnedWorkflows.includes(workflow.name)
        ? 'text-amber-500 hover:text-amber-600'
        : 'text-muted-foreground hover:text-foreground'
    }`}
    title={settings.pinnedWorkflows.includes(workflow.name) ? 'Unpin workflow' : 'Pin to top'}
  >
    <Pin className="w-3 h-3" />
  </button>
</div>
```

- [ ] **Step 5: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 6: Run tests**

```bash
npm test -- --no-coverage
```

Expected: 37/37 passing.

- [ ] **Step 7: Commit**

```bash
git add src/components/workflow-dashboard.tsx
git commit -m "feat: add pin button to workflow cards with sort-to-top behaviour"
```

---

### Task 4: Open PR against main

**Files:** none (git operations only)

- [ ] **Step 1: Verify branch**

```bash
git branch --show-current
```

Expected output: `feature/workflow-filters-and-pins`

If not on the feature branch, the work was committed to the wrong branch — stop and investigate.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feature/workflow-filters-and-pins
```

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --base main \
  --title "feat: workflow name filter and pin-to-top" \
  --body "$(cat <<'EOF'
## Summary

- Filter input in the dashboard toolbar — case-insensitive substring match on workflow name, persisted to localStorage
- Pin button on each workflow card — pinned workflows float to the top of each repository section, highlighted in amber, persisted to localStorage
- Both controls work in normal and compact mode
- Browser-stored values survive page reloads

## Test Plan
- [ ] Type in the filter box — only matching workflows shown across all repos
- [ ] Clear button (×) appears when filter is non-empty, clears on click
- [ ] Click pin icon on a card — it moves to the top, icon turns amber
- [ ] Click again — unpinned, returns to normal order
- [ ] Reload page — filter text and pins persist
- [ ] `npm test` — 37/37 passing
EOF
)"
```

- [ ] **Step 4: Verify CI passes**

```bash
gh pr checks --watch
```

Expected: Lint ✅ Test ✅ Build ✅ CI ✅
