# Edge-to-Edge Dashboard Chrome + Chapter Study Wrapper Removal

Date: 2026-03-11

## Summary
Remove the outer rounded background wrappers on dashboard-chrome pages and the chapter study workspace so content sits directly on the page background with edge-to-edge layout.

## Goals
- Remove the outer rounded container shape on forum and chapter screens.
- Apply the change across all pages using the dashboard chrome layout.
- Keep inner surfaces and existing content structure intact.

## Non-Goals
- Redesign inner cards, panels, or surface components.
- Change data flow or component behavior.
- Introduce new visual themes or typography.

## Approach Options
1. Remove outer rounded wrapper and its padding in `DashboardChromeLayout` and `ChapterStudyWorkspace`, keep inner surfaces.
2. Remove wrapper background/rounding but keep padding.
3. Refactor layout spacing ownership into `AppShell` and per-page content.

## Selected Approach
Option 1: remove the outer rounded background wrapper and its padding in the shared chrome layout and the chapter study workspace, keeping inner surfaces unchanged.

## Architecture & Components
- `frontend/components/dashboard/dashboard-chrome-layout.tsx`
  - Remove the outer `div` that applies `rounded-[1.6rem] bg-secondary p-4 sm:p-6 lg:p-8`.
  - Ensure the chrome content uses edge-to-edge layout with minimal padding at the app shell level.
- `frontend/components/learn/chapter-study-workspace.tsx`
  - Remove the outer wrapper with the same rounded background and padding.
  - Keep the grid and inner surfaces unchanged.

## Data Flow
No changes.

## Error Handling
No changes.

## Testing
- No new automated tests.
- Manual sanity check on:
  - `/forum`
  - `/dashboard`
  - `/ai-tutor`
  - a chapter study page

## Risks & Mitigations
- Risk: Content feels too tight without the wrapper padding.
  - Mitigation: Retain existing inner section padding; adjust only if visual regression is reported.
