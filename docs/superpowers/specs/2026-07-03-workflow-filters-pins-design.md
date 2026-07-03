# Workflow Name Filter & Pin Design

**Date:** 2026-07-03

## Goal

Allow users to filter the dashboard by workflow name and pin specific workflows to the top of each repository section — configured inline on the dashboard, persisted across sessions.

## Architecture

Two new fields in `DisplaySettings` (no new context or storage keys):

```ts
workflowNameFilter: string   // case-insensitive substring match; empty = show all
pinnedWorkflows: string[]    // exact workflow names pinned to top across all repos
```

Both merge into the existing `github-flow-dashboard-settings` localStorage object.

No API changes — filtering and sorting are client-side only.

## Components

### `display-settings-context.tsx`

- Add `workflowNameFilter` (default `''`) and `pinnedWorkflows` (default `[]`) to `DisplaySettings`
- Add `setWorkflowNameFilter(filter: string): void` and `togglePinnedWorkflow(name: string): void` to context type
- Implement both — `togglePinnedWorkflow` adds the name if absent, removes it if present
- Persist both fields via the existing `localStorage.setItem` call in `updateSettings`

### `workflow-dashboard.tsx`

**Filter input (toolbar):**
- Reads `workflowNameFilter` and `setWorkflowNameFilter` from `useDisplaySettings()`
- Renders a text input below the status filter cards, left-aligned, full-width on mobile
- Shows a clear (×) button when the filter is non-empty
- Placeholder: `"Filter by workflow name..."`
- Filtering: `workflow.name.toLowerCase().includes(filter.toLowerCase())`
- Applied after the existing `activeFilter` (status) and `onlyMe` filters

**Pin button (per workflow card):**
- Reads `pinnedWorkflows` and `togglePinnedWorkflow` from `useDisplaySettings()`
- Pin icon (Lucide `Pin`) in top-right corner of each card
- Visible on hover in normal mode; always visible in compact mode
- Filled/highlighted style when the workflow name is in `pinnedWorkflows`
- `onClick` calls `togglePinnedWorkflow(workflow.name)`; stops event propagation

**Sort order within each repository section:**
- Pinned workflows first (sorted alphabetically by name)
- Unpinned workflows after (existing order preserved)
- A workflow name pinned in one repo applies to all repos with that workflow name

## Git Workflow

- Branch: `feature/workflow-filters-and-pins` from `main`
- PR opened against `main` when CI passes
- No deploy step — standard CI (lint + test + build)

## Out of Scope

- Per-repository pin state (pins are global by workflow name)
- Branch name filtering
- Drag-to-reorder
