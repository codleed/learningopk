# Dashboard Style Unification Implementation Checklist

## Objective
Make every primary screen follow the same visual language as the current dashboard style while keeping functionality fully working (all buttons, links, tabs, forms, and actions).

## Scope
- Public/Auth: `/`, `/login`, `/register`, `/forgot-password`
- Learning: `/<board>/<grade>/<subject>`, `/<board>/<grade>/<subject>/<chapter>?tab=summary|exercises|flashcards|quiz`
- Progress: `/dashboard`, `/dashboard/[subject]`
- Forum: `/forum`, `/forum/[threadId]`
- Admin: `/admin`, `/admin/content`, `/admin/forum`

## Master Prompt (Full Project)
Use this prompt to run the full redesign + functional hardening effort:

```text
You are working in the LearningoPK Next.js App Router codebase.

Goal:
Unify all screens so they follow the same visual style language as the current dashboard design (dark, layered cards, subtle borders, soft glows/gradients, rounded geometry, compact high-contrast controls), while preserving and fixing functionality so all user actions work.

Source of truth:
- Visual reference: frontend/app/(dashboard)/dashboard/page.tsx
- Theme tokens: frontend/app/globals.css
- Existing shared shell/components in frontend/components/foundation and frontend/components/ui

Hard requirements:
1) Apply dashboard-style look across all major routes without breaking route behavior.
2) Keep layout responsive; no horizontal overflow on mobile.
3) Ensure all interactive UI elements function:
   - buttons trigger intended actions
   - links navigate correctly
   - forms submit and show feedback
   - tabs switch content correctly
   - AI chat can send/stream responses
4) Fix non-functional/placeholder actions:
   - if action is not implemented, either wire it or render disabled state with clear label.
5) Keep accessibility:
   - visible focus states
   - semantic headings
   - label/input association
   - keyboard navigation for core flows
6) Keep TypeScript strict and lint clean.

Implementation strategy:
- Reuse and extend existing foundation components first; avoid one-off duplicated styles.
- Extract repeated dashboard visual patterns into reusable utilities/components.
- Apply style route-by-route in phases; verify each phase before moving on.
- Preserve existing API contracts and business logic.

Testing and verification:
- Run typecheck + lint after each phase.
- Run e2e smoke and UI-quality tests.
- Add/adjust tests where needed for broken button/link behavior.
- Confirm key journey works:
  register -> chapter summary -> exercises -> AI -> quiz -> dashboard -> forum

Commands:
- pnpm.cmd --filter frontend typecheck
- pnpm.cmd --filter frontend lint
- pnpm.cmd --filter frontend test:e2e:smoke
- pnpm.cmd --filter frontend test:e2e

Deliverables:
- Updated UI across all scoped screens using dashboard style language.
- Functional fixes for broken actions.
- Updated/added tests proving critical interactions.
- Short change log of files touched and what was fixed.
```

## Phased Implementation Plan

## Phase 1: Foundation and Baseline
- [ ] `DS-01` Inventory all target routes and all interactive controls (buttons/links/forms/tabs).
- [ ] `DS-02` Extract reusable dashboard-style primitives/tokens (surface, glow, radius, border, spacing rules).
- [ ] `DS-03` Create/extend shared layout wrappers for dashboard-like sections/cards/toolbar blocks.
- [ ] `DS-04` Build a route-by-route visual + interaction audit sheet (what is styled, what is broken).
- [ ] `DS-05` Verify baseline before restyling:
  - `pnpm.cmd --filter frontend typecheck`
  - `pnpm.cmd --filter frontend lint`

Phase 1 done when:
- Shared style primitives are ready.
- You have a complete interaction inventory and baseline status.
- Project is typecheck/lint clean.

## Phase 2: Public/Auth Screens
- [ ] `DS-06` Restyle `/`, `/login`, `/register`, `/forgot-password` with dashboard visual language.
- [ ] `DS-07` Keep auth UX clear (errors, success, loading, disabled states).
- [ ] `DS-08` Verify all auth CTA buttons and links work.

Phase 2 done when:
- Auth/public screens match style direction and all controls function.

## Phase 3: Learning Flow Screens
- [ ] `DS-09` Restyle subject overview and chapter shell (tabs, cards, headers, content areas).
- [ ] `DS-10` Keep chapter tabs usable and visually consistent (summary/exercises/flashcards/quiz).
- [ ] `DS-11` Ensure AI panel layout remains fixed right sidebar where required and fully functional.
- [ ] `DS-12` Validate all chapter actions (open AI, quiz submit, tab switches, back links).

Phase 3 done when:
- End-to-end learning route style is unified and interactions are working.

## Phase 4: Dashboard + Forum + Admin Consistency
- [ ] `DS-13` Align `/dashboard/[subject]` and related progress views to same style system.
- [ ] `DS-14` Restyle `/forum` and `/forum/[threadId]` without breaking posting/reply/vote actions.
- [ ] `DS-15` Restyle `/admin`, `/admin/content`, `/admin/forum` and verify moderation actions.

Phase 4 done when:
- Community/admin/progress screens share same style language and behavior integrity.

## Phase 5: Functional Hardening and QA
- [ ] `DS-16` Fix every non-functional button/link/form discovered in prior phases.
- [ ] `DS-17` Add or update e2e checks for critical interactions and no-overflow constraints.
- [ ] `DS-18` Run full verification:
  - `pnpm.cmd --filter frontend typecheck`
  - `pnpm.cmd --filter frontend lint`
  - `pnpm.cmd --filter frontend test:e2e:smoke`
  - `pnpm.cmd --filter frontend test:e2e`
- [ ] `DS-19` Produce final QA report (route coverage + fixed interactions list).

Phase 5 done when:
- Tests pass and the full investor/demo journey works with unified styling.

## Phase 1 Starter Prompt
Use this to kick off Phase 1 only:

```text
Start Phase 1 only for LearningoPK dashboard-style unification.

Phase 1 goals:
1) Inventory all target routes and interactive controls.
2) Extract dashboard visual primitives into reusable shared styles/components.
3) Create a baseline audit report for broken/non-functional buttons, links, tabs, and forms.
4) Keep code type-safe and lint-clean.

Do not restyle all routes yet; only complete foundation + baseline.

Scope for inventory:
- /, /login, /register, /forgot-password
- /dashboard, /dashboard/[subject]
- /<board>/<grade>/<subject>
- /<board>/<grade>/<subject>/<chapter>?tab=summary|exercises|flashcards|quiz
- /forum, /forum/[threadId]
- /admin, /admin/content, /admin/forum

Deliverables:
- Shared style primitives added/refined (dashboard-like surfaces, cards, toolbar, section wrappers).
- A markdown audit file listing:
  - route
  - interactive element
  - current behavior
  - status (working/broken/placeholder)
  - recommended fix
- Confirmation of:
  - pnpm.cmd --filter frontend typecheck
  - pnpm.cmd --filter frontend lint

At the end, summarize exactly what was created/changed and propose Phase 2 execution order.
```
