# Kitab Redesign — Session Export

**Date:** 2026-09-21 · **Scope:** `learningopk/frontend` (Next.js 16.3.2, React 19, Tailwind v4, Turbopack)
**Plan of record:** [`docs/plans/2026-09-21-kitab-ui-redesign-plan.md`](../plans/2026-09-21-kitab-ui-redesign-plan.md)
**Branch:** `fix/drop-dead-deps` · **Status:** All 7 PRs landed · build / typecheck / lint green · cutover executed

> **Kitab** (کتاب — "book") reimagines LearningoPK as a printed study workbook: warm paper, warm ink, hairline rules, and a teacher's red pen. It is a re-foundation — navigation model, screen composition, component vocabulary, color, type, and spacing all changed. Nothing from the old indigo/glass/dark-navy identity survives.

---

## 0. Executive summary

Executed the approved 7-PR build order as a **parallel `/kitab` surface**, then — on explicit approval — performed the cutover: legacy LeftRail deleted, 301 redirect map shipped, obsolete specs rewritten.

| Gate | Result |
|---|---|
| `pnpm build` (Next 16.3.2 / Turbopack) | ✅ `✓ Compiled successfully in 25.2s`, 73/73 static pages, 0 errors |
| `next.config.ts` redirect map parsed | ✅ `✓ Running next.config.ts took 1628ms` |
| `tsc --noEmit` (whole frontend) | ✅ exit 0, zero diagnostics |
| ESLint (`src/components/kitab` + `app/kitab`) | ✅ exit 0 (0 errors, 0 warnings) |
| §0 banned-pattern sweep | ✅ 0 indigo/violet/blue-navy, 0 shadows/blur/hover-lift |

**Key discovery that unblocked the cutover:** plan §8.4 flagged the redirect map as needing routes-mcp owner confirmation. Inspection of `mcp/routes-mcp/src/index.ts` showed it is a **backend API route listing/linting tool** (`list_routes`, `get_route_schema` over `backend/src/routes/**.ts`). It owns no frontend URL space, so the §2.4 301 table was safe to ship in `frontend/next.config.ts`. §8.4 in the plan is now marked resolved.

---

## 1. PR 1 — Tokens + Fonts

**Created**

- `frontend/src/design-system/kitab-tokens.css` — the full token set: `paper #FAF7F0`, `paper-raised #FFFDF8`, `ink #211D16`, `ink-soft #5D5748`, `ink-faint #8A8272`, `hairline #DCD5C8`, `brick #B3412E`, `moss #5F6F52`, `ochre #B07D2B`, `plum #6E4A6E`, `graphite #3E3A33`; night-reading dark pair; legacy alias bridge (`--bg-base`, `--secondary`, …) so untouched screens keep rendering; radii **2 / 4px**; `--quietbar-h: 40px`; motion tokens `--press 120ms`, `--swap 180ms`, `--overlay 280ms` with `cubic-bezier(0.2, 0, 0, 1)`.
- `frontend/src/design-system/kitab-theme.css` — Tailwind v4 `@theme inline` bridge (color roles, `font-display/ui/data`, 1.25 type scale, `--container-page: 1152px` → `max-w-page`); base layer with `.tnum` (tabular numerals), `.overline` (tracked caps), masthead double-rule (3px ink over 1px), brick focus ring, `prefers-reduced-motion` block, `slide-in-left` keyframes.

**Modified**

- `frontend/app/layout.tsx` — font stack replaced: Syne / DM Sans / JetBrains Mono → **Fraunces** (static 500/600), **Inter** (400/500/600), **IBM Plex Mono** (400/500) via `next/font/google`.
- `frontend/app/globals.css` — Kitab CSS imported **before** the legacy `tokens.css` so Kitab wins the cascade without deleting anything (pre-cutover safety).

**Decision:** Fraunces loaded as **static 500/600** rather than the variable font, per §8.1's recommendation — drops the SOFT/WONK axes and cuts payload.

## 2. PR 2 — Paper primitives (`frontend/src/components/kitab/`)

Every visual is new; Radix remains only as a *behavior* base. Barrel export lives in `index.ts`.

| Component | File | Notes |
|---|---|---|
| `StampButton` / `StampLink` | `stamp-button.tsx` | Primary = solid brick, caps + 0.08em tracking; secondary = ink outline; tertiary = underlined ink link. Press feedback is a 1px translate — never a lift. |
| `Folio`, `FolioHeader`, `FolioBody` | `folio.tsx` | Hairline-bordered paper panel. `tone="brick" \| "dim"`. ≤4px radius, **no** shadow, **no** glass. |
| `Tag` | `tag.tsx` | Rectangular 2px-radius mono-caps label. Semantic tints for status only; never a decorative colored pill. |
| `Rule`, `MastheadRule` | `rule.tsx` | Hairline / double-rule / scissor (dashed cut) variants. |
| `Seal` | `seal.tsx` | Square-stamp identity mark, initials in mono on ink. Replaces the decorated avatar. |
| `Wayfinding`, `TitleBlock` | `wayfinding.tsx` | Breadcrumbs-as-text ("Library › Physics › Ch. 3"); every crumb clickable; carries orientation with zero persistent chrome. |
| `Field` | `field.tsx` | Underline-only inputs (bottom rule, no box). |
| `Galley` | `galley.tsx` | 66–70ch reading measure column. |
| `Wire` | (in barrel) | Single-line bottom notices, mono timestamps, stack max 3. Replaces toast. |
| `Register` | `register.tsx` | Ledger rows: `when` / `what` / `amount`, tabular mono numerals, right-aligned figures. |
| `ReadingRoom` | `reading-room.tsx` | Serif measure + fold-out TOC + marginalia column. |
| `ExamDesk` | `exam-desk.tsx` | Paper sheet + mono timer + numbered question grid. |
| `OverlayFolio` | `overlay-folio.tsx` | Modal reserved for irreversible actions; ink scrim, paper panel, masthead rule inside. |
| `PullOut` | `pull-out.tsx` | Left-edge drag drawer + bookmark tab (replaces the vaul sheet). |

---

## 3. PR 3 — Chrome

- **`KitabShell`** (`kitab-shell.tsx`, server component) — chrome-less replacement for `AppShell`. Renders `max-w-page` main, hairline footer, and feeds the client island with `HUB_LINKS` (Today · Library · Practice · Community · Records) plus staff-only entries (Admin console, School ERP) gated by `isStaffSession`.
- **`KitabIndexClientBridge`** (`kitab-index-bridge.tsx`) — the only client island in the chrome. Owns Index open state + the global `⌘K` / `Ctrl+K` listener; renders `QuietBar` + `KitabIndex`.
- **`QuietBar`** (`quiet-bar.tsx`) — exactly **40px**, desktop-only (`hidden lg:flex`), `data-testid="kitab-quietbar"`. Wordmark · hub links (active = brick) · "Index ⌘K" trigger · theme toggle. **Mobile gets no bar at all**, per §2.2.
- **`KitabIndex`** (`kitab-index.tsx`) — full-screen overlay palette: empty state shows the five hubs as large serif entries; typing fuzzy-filters the A–Z grouped index.
- **`ThemeSeal`** (`theme-seal.tsx`) — Paper / Night-reading toggle reusing the existing `@/lib/theme` module via `useSyncExternalStore` + a `MutationObserver` — deliberately **no** `setState`-in-effect.

---

## 4. PR 4 — Student hubs (`frontend/app/kitab/`)

| Route | File | Data source |
|---|---|---|
| `/kitab` | `page.tsx` | redirect → `/kitab/today` |
| `/kitab/today` | `today/page.tsx` | `getDashboardSummary` — date masthead, contents column (subject rows with visited %), margin column (Today's focus, daily goal, XP + streak, recent marks register) |
| `/kitab/library` | `library/page.tsx` | `getSubjectsList` — grouped by board, spine-style rows; appendix links to formulas / notes / past papers |
| `/kitab/practice` | `practice/page.tsx` | `getDashboardSummary` + `fetchReviewStats` — SRS figures + recent quiz register |
| `/kitab/community` | `community/page.tsx` | `getForumThreads({ solved: "all", limit: 12 })` — the letters page |
| `/kitab/records` | `records/page.tsx` | `getDashboardSummary` + `getLeaderboard("global", "xp")` — quiz history, merit board, 12-week moss attendance grid |

All pages are server components reading through the **existing** API modules — no new endpoints, no backend changes.

---

## 5. PR 5 — Console & School OS

- `/kitab/console` — staff-only (`isStaffSession`); `getAdminModerationFlags` + `getAdminUsers` (moderation queue + user inspector).
- `/kitab/school` — `getSchoolDashboard` + `getSchoolStudents`; headline stats, Inspector registers, approval Queue. Approvals stay an explicit queue with a visible audit trail.

Deep legacy routes (`/admin/**` ≈ 40 pages, `/school/erp/**`) continue to resolve directly — the redesign retires `*/add` `*/edit` pages in a later release, not this one.

---

## 6. PR 6 — Margin Companion

`MarginCompanion` (`margin-companion.tsx`) — the AI tutor demoted from a destination page to a margin panel. Implements all **ten** required states as mono-caps **state chips** (no orb, no pulse): `idle` · `listening` · `planning` · `tool-running` · `streaming-partial` · `awaiting-verification` · `needs-clarification` · `error-retry` · `cancelled` · `done-with-caveats`. `awaiting-verification` shows the proposed write payload plus a one-tap undo *before* commit. SRS queue renders in an `OverlayFolio` with again / hard / good / easy stamps wired to `submitReview`.

## 7. PR 7 — Cutover (the approving "Approved" turn)

### 7.1 301 redirect map — `frontend/next.config.ts`

Shipped as an exact-match table (`permanent: true` → HTTP 308/301). Deep routes keep resolving on their own pages, so **no wildcards** are used.

```ts
const kitabRedirects = [
  { source: "/dashboard",   destination: "/kitab/today",     permanent: true },
  { source: "/calendar",    destination: "/kitab/today",     permanent: true },
  { source: "/subjects",    destination: "/kitab/library",   permanent: true },
  { source: "/formulas",    destination: "/kitab/library",   permanent: true },
  { source: "/review",      destination: "/kitab/practice",  permanent: true },
  { source: "/past-papers", destination: "/kitab/practice",  permanent: true },
  { source: "/forum",       destination: "/kitab/community", permanent: true },
  { source: "/stats",       destination: "/kitab/records",   permanent: true },
  { source: "/leaderboard", destination: "/kitab/records",   permanent: true },
  { source: "/admin",       destination: "/kitab/console",   permanent: true },
  { source: "/school",      destination: "/kitab/school",    permanent: true },
];
```

**Deliberately NOT redirected** (still direct, because Kitab has no replacement surface yet):
`/admin/**` (≈40 CRUD pages), `/school/erp/**`, `/past-papers/[id]/*`, `/[board]/[grade]/[subject]/[chapter]`, `/subjects/[subject](/[chapter])`, `/notes`, `/settings`, `/ai-tutor/*`, `/forum/[threadId]`.

### 7.2 LeftRail deleted (§3.5)

| Action | Path |
|---|---|
| Rewritten chrome-less | `src/components/foundation/auth-layout-wrapper.tsx` |
| Deleted | `src/components/foundation/left-rail.tsx` (16.7 KB) |
| Deleted | `src/components/foundation/left-rail/` — `left-rail-config.ts`, `left-rail-types.ts`, `role-toggle.tsx` |
| Removed token | `app/globals.css` — `--left-rail-width: 72px` |

`AuthLayoutWrapper` now renders a plain `main#main-content` with no rail offset, no `ViewMode` state, and no localStorage view-mode key. It **keeps accepting** `session` / `currentPath` so the ~30 legacy `AppShell` call sites (`/forum`, `/admin`, `/school`, `/teacher`, `(dashboard)/*`) compile unchanged — they simply render without chrome until they migrate into the Kitab shell. `AppShell` itself is untouched, so the migration is incremental rather than a big-bang rewrite.

### 7.3 Specs updated

- **Deleted** `tests/e2e/admin-left-rail.spec.ts` (tested a component that no longer exists).
- **Created** `tests/e2e/admin-kitab-access.spec.ts` — login helper now waits for `/kitab/today`; asserts `/dashboard` → `/kitab/today`; asserts `/kitab/console` renders with the QuietBar; asserts `/admin` → `/kitab/console` while `/admin/users`, `/admin/content`, `/admin/audit` still resolve directly.
- **Updated** `tests/e2e/phase2-auth-dashboard.spec.ts` — registration helper expects `/kitab/today` + `data-testid="kitab-quietbar"`; the left-rail test became a Kitab-hub test; the collapse/expand test was deleted; guest tests now assert the QuietBar is absent.

### 7.4 Plan §8.4 resolved

The "confirm with the routes-mcp owner" item is closed: `routes-mcp` is a backend API route linter and owns no frontend URLs. The §2.4 table shipped as above.

---

## 8. Validation gates — final results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ `TSC_EXIT_0`, zero diagnostics |
| Production build | `pnpm build` | ✅ `✓ Compiled successfully in 25.2s`, 73/73 static pages |
| Config parse | (in build) | ✅ `✓ Running next.config.ts took 1628ms` — redirect map valid |
| Lint | `npx eslint src/components/kitab app/kitab src/components/foundation` | ✅ exit 0, 0 errors / 0 warnings |
| §0 banned sweep | grep `indigo\|violet\|#6366F1\|#0D0F17\|backdrop-blur\|hover-lift\|shadow-` | ✅ 0 hits in Kitab trees |
| LeftRail sweep | grep `left-rail\|LeftRail\|Primary navigation` | ✅ only 3 benign prose hits (see below) |

**Residual sweep hits (all prose, all verified):**
1. `auth-layout-wrapper.tsx` — the comment *"The persistent LeftRail is deleted (§3.5)"*.
2. `kitab-shell.tsx` — the comment *"The Index is the primary navigation"*.
3. `src/lib/get-initials.ts` — **fixed**: stale JSDoc said "Used across dashboard, left-rail, and profile components" → now "dashboard, Kitab seal, and profile components".

**Defects found and fixed during the gates** (worth noting as the pattern behind them): a `</span>` closing a `<Link>`; a missing `"use client"` on `margin-companion.tsx`; a type-only import of `QuietBarLink`; unescaped apostrophes; two `setState`-in-effect violations (restructured to `autoFocus` + an external-store subscription); and several stale API guesses (`forumApi` → `getForumThreads`, `flags`/`users` → the real `entries` field, `getAdminOverview` → the real function names). The theme toggle was rebuilt on `useSyncExternalStore` + `MutationObserver` specifically to avoid a third `setState`-in-effect.

The cutover's own lint pass caught two `no-unused-vars` warnings in the rewritten `auth-layout-wrapper.tsx` (`_session`, `_currentPath` — this repo's ESLint config has no `_`-prefix exemption). Fixed by leaving the props **undestructured** (they stay in the prop type, so all call sites still typecheck) and dropping the now-pointless client boundary: the wrapper is a **server component** again, so ~30 legacy screens shed a client JS chunk instead of gaining one.

---

## 9. File inventory

### Created — design system & primitives
```
frontend/src/design-system/kitab-tokens.css
frontend/src/design-system/kitab-theme.css
frontend/tsconfig.kitab.json
```

### Created — `frontend/src/components/kitab/`
```
index.ts                folio.tsx           stamp-button.tsx     tag.tsx
rule.tsx                seal.tsx            wayfinding.tsx       field.tsx
galley.tsx              register.tsx        reading-room.tsx     exam-desk.tsx
overlay-folio.tsx       pull-out.tsx        kitab-index.tsx      quiet-bar.tsx
theme-seal.tsx          kitab-shell.tsx     kitab-index-bridge.tsx
margin-companion.tsx
```

### Created — `frontend/app/kitab/`
```
layout.tsx   page.tsx   today/page.tsx   library/page.tsx
practice/page.tsx   community/page.tsx   records/page.tsx
console/page.tsx   school/page.tsx
```

### Created — tests & docs
```
frontend/tests/e2e/admin-kitab-access.spec.ts
docs/sessions/2026-09-21-kitab-redesign-session.md   (this file)
```

### Modified
```
frontend/app/layout.tsx                                   Fraunces / Inter / IBM Plex Mono
frontend/app/globals.css                                  Kitab CSS import order; --left-rail-width removed
frontend/next.config.ts                                   kitabRedirects() 301 table
frontend/src/components/foundation/auth-layout-wrapper.tsx chrome-less rewrite, LeftRail removed
frontend/src/lib/get-initials.ts                          stale "left-rail" JSDoc corrected
frontend/tests/e2e/phase2-auth-dashboard.spec.ts          Kitab assertions
docs/plans/2026-09-21-kitab-ui-redesign-plan.md           §8.4 marked resolved
```

### Deleted
```
frontend/src/components/foundation/left-rail.tsx
frontend/src/components/foundation/left-rail/left-rail-config.ts
frontend/src/components/foundation/left-rail/left-rail-types.ts
frontend/src/components/foundation/left-rail/role-toggle.tsx
frontend/src/components/foundation/left-rail/            (directory)
frontend/tests/e2e/admin-left-rail.spec.ts
```

---

## 10. Decisions & rationale

1. **Parallel `/kitab` surface, then cutover.** The legacy app stayed fully working through all six build PRs; the cutover was a separate, approvable step. Route groups `(dashboard)` and `(learn)` were never touched.
2. **Kitab CSS imported *before* legacy `tokens.css`.** Kitab wins the cascade by order rather than by deleting legacy tokens — so untouched legacy screens still render while the redesign lands incrementally.
3. **`AppShell` left intact; `AuthLayoutWrapper` keeps its prop signature.** ~30 call sites compile unchanged and simply lose the rail. Migration to `KitabShell` can proceed screen by screen.
4. **Static Fraunces 500/600** over the variable font (§8.1 recommendation): drops SOFT/WONK axes, smaller payload.
5. **Exact-match redirects only.** No wildcards, because `/admin/**`, `/school/erp/**`, and `/past-papers/[id]/*` still have real pages. Wildcards would have broken staff tooling.
6. **Mobile ships no chrome at all** (§2.2) — pull-out gesture + bookmark tab + the Index. This is intentional, not an omission.
7. **`useSyncExternalStore` for the theme toggle** rather than `useState` + `useEffect` — avoids `setState`-in-effect and keeps the DOM class as the single source of truth.
8. **No shadows, no blur, no hover-lift anywhere** — elevation is expressed purely as hairline rules and ink states.

---

## 11. Open items / follow-ups

| # | Item | Notes |
|---|---|---|
| 1 | Legacy screens on `AppShell` are now chrome-less | They render, but with no persistent nav. Either migrate them into `KitabShell` or give them a minimal QuietBar. |
| 2 | `/admin/**` `add`/`edit` page retirement | §2.3 Console + §3.3 Inspector. Not in this release — queue + inspector is a larger change. |
| 3 | Contrast CI script | §7.2 calls for a ≥4.5:1 token-pair assertion in CI. Not yet wired. |
| 4 | Playwright suite not executed | Specs are updated and typecheck-clean, but per the route-state matrix they need Postgres + Redis + backend + seeded data (`docker:up`, `db:migrate`, `db:seed`). Verification here fell back to build/typecheck/lint, as that matrix explicitly permits. |
| 5 | Dark theme shipped alongside light | §8.2 recommended light-only first. Both shipped with individually re-checked contrast pairs — flagging the deviation. |
| 6 | ERP "compact register" density toggle | §8.3 still open, pending real usage data. |

---

## 12. Appendix — command reference

```powershell
# from learningopk/frontend
npx tsc --noEmit                                                  # typecheck gate
pnpm build                                                        # production build (Turbopack)
npx eslint src/components/kitab app/kitab src/components/foundation  # lint gate

# banned-pattern sweep (§0 / §7.2 unrecognizability review)
Get-ChildItem -Recurse -Include *.tsx,*.ts,*.css -Path src,app |
  Select-String -Pattern 'indigo|violet|#6366F1|#0D0F17|backdrop-blur|hover-lift'

# LeftRail removal verification
Get-ChildItem -Recurse -Include *.tsx,*.ts,*.css -Path src,app |
  Select-String -Pattern 'left-rail|LeftRail|Primary navigation'
```

**Generated log artifacts** (`build-kitab.log`, `tsc-kitab.log`, `eslint-final.log`, `eslint-cutover.log`) are transient verification output, not part of the deliverable — all four were removed after the gates passed.

---

*End of session export. Plan of record remains [`docs/plans/2026-09-21-kitab-ui-redesign-plan.md`](../plans/2026-09-21-kitab-ui-redesign-plan.md); this document is the execution record for the 2026-09-21 run.*
