# Kitab v3 — "Night Study" Redesign Spec

**Date:** 2026-09-22 · **Status:** Approved design (brainstorm complete, pre-plan)
**Supersedes visual layer of:** [`docs/plans/2026-09-21-kitab-ui-redesign-plan.md`](../../plans/2026-09-21-kitab-ui-redesign-plan.md) — its **UX/IA is kept verbatim**; its print/editorial *visual* system (warm paper, brick red, Fraunces, hairline-only, no shadows, 2/4px radii, light-first) is replaced.
**Scope:** `learningopk/frontend` (+ one backend verification) · **Execution:** Approach 1 (hybrid restyle + polish)

---

## 1. Problem statement

The 2026-09-21 Kitab redesign shipped 7 PRs: chrome-less UX, five hubs, ⌘K Index, margin column — **the user loves the UX**. Two visual problems remain:

1. **Half implemented** — ~90 legacy screens still render the *old* shadcn vocabulary (`ui/*` with shadows, hover-lift, gradient borders) beside the flat print-style Kitab hubs. Two visual worlds coexist.
2. **Not modern** — the print/editorial look (sharp 2/4px radii, zero shadows, hairline-only structure, warm paper) reads plain/dated, not contemporary.

**User decisions (2026-09-22 brainstorm):** keep the Kitab UX wholesale; redesign the visual layer to a modern dark-first system; ship **both themes**; guarantee **admin access to School ERP**; execute the **full UI pass this session** via **Approach 1**.

---

## 2. Locked design decisions

| Decision | Choice |
|---|---|
| Direction | **Pro Dark** — dark-first warm charcoal pro-tool aesthetic |
| Accent | **Lime** — `#9AD42E` base / `#B7F04A` bright / `#141611` on-accent (replaces brick red) |
| Typography | **Poppins** single-family (400/600/700) + **IBM Plex Mono** for data/timers/marks |
| Themes | **Both** — dark default, light ("day reading") alternate, both contrast-audited |
| Strategy | **Approach 1** — restyle shared `ui/*` primitives in place + restyle kitab components + polish chrome/hubs; no per-screen rewrites |
| UX/IA | **Unchanged** — five hubs, ⌘K Index, chrome-less mobile, breadcrumbs-as-text, margin column, queue+inspector direction |
| Access | Admin (platform `role=admin`) must reach School ERP end-to-end, with regression spec |

---

## 3. Visual foundation

### 3.1 Theme model

- **Dark is default** (`:root`); `.dark` class semantics invert: the dark palette becomes `:root`, light becomes `.light`/default-off — implementation may keep `.dark` as the *light* class or swap selectors, but the **default (no-class) experience must be dark**.
- Theme toggle (`ThemeSeal`) keeps working; choice persists via the existing `@/lib/theme` module.
- **No token is shared across themes without an individual contrast re-check.**

### 3.2 Dark palette (default)

| Token | Hex | Role |
|---|---|---|
| `ground` | `#131211` | page background |
| `surface` | `#1C1A17` | cards / folios / QuietBar |
| `surface-raised` | `#24211D` | overlays, popovers, inputs, wells |
| `border` | `#35312B` | default 1px hairline |
| `border-strong` | `#4A453C` | emphasized borders, input borders |
| `text` | `#EDE6DA` | primary |
| `text-soft` | `#B3AA9B` | secondary |
| `text-faint` | `#8A8272` | captions (≥12px) |
| `accent` | `#9AD42E` | buttons, active nav, links, focus |
| `accent-bright` | `#B7F04A` | hover, focus ring, tags on accent |
| `on-accent` | `#141611` | text on lime fills |
| `danger` | `#F07178` | errors (coral) |
| `warning` | `#FBBF24` | due-soon / caution |
| `data` | `#C9C1B4` | mono numerals, timers, code |

**Status semantics:** lime serves as both primary accent *and* success/correct (standard dark-UI pattern). Errors use coral so green never means "broken." Amber for warnings. Color is always paired with a word/mark (✓ / ! / ·) for color-blind safety.

### 3.3 Light palette (alternate)

| Token | Hex |
|---|---|
| `ground` | `#F6F6F7` |
| `surface` | `#FFFFFF` |
| `surface-raised` | `#FFFFFF` (shadow separates) |
| `border` | `#E4E4E7` |
| `border-strong` | `#D4D4D8` |
| `text` | `#111113` |
| `text-soft` | `#52525B` |
| `text-faint` | `#71717A` |
| `accent` (fills) | `#9AD42E` with `on-accent #141611` |
| **`accent-text`** | **`#4A6B0A`** — lime fails AA as text on white; links/active-text use this darkened green |
| `danger` | `#DC2626` |
| `warning` | `#B45309` |

### 3.4 Typography

- **Poppins** via `next/font/google`: 400, 600, 700. Replaces Fraunces (display) *and* Inter (UI). Hierarchy = weight + size, single family.
  - 700 display/page titles — tight tracking (−0.02 to −0.03em at ≥24px)
  - 600 titles, buttons, nav, table headers
  - 400 body/UI
- **IBM Plex Mono** 400/500 stays: timers, marks, attendance, IDs, code, tags (mono caps), register columns.
- Scale: keep the 1.25 ratio and token names (`display/title/heading/subhead/body/caption/data`); body 16px / line-height 1.6 (reading measure 66–70ch kept — an IA rule, not a visual one).
- **Fraunces and Inter are removed from `app/layout.tsx`.** Fallback stacks: `Poppins, system-ui, sans-serif`.

### 3.5 Shape, depth, motion

| Token | v3 value | Replaces (v2) |
|---|---|---|
| radius-tag | **6px** | 2px |
| radius-button | **8px** | 2px |
| radius-card | **12px** | 4px |
| shadow-sm | `0 1px 2px rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.35)` (dark) / soft gray (light) | none ("no shadows" ban lifted) |
| shadow-md | `0 24px 48px rgba(0,0,0,.55)` (dark) | none |
| focus | 2px `accent-bright` ring, 2px offset | brick underline |

- **Still banned:** glassmorphism / `backdrop-filter` blur (low-end Android budget), indigo/violet/periwinkle hues, conic-gradient card borders, gradient text, confetti, shimmer skeletons.
- Hover: border → `border-strong` + shadow-sm deepen; links → `accent-bright` (dark) / `accent-text` (light).
- Press: `scale(0.98)` (buttons) — replaces the 1px translate.
- Motion tokens unchanged: `--press 120ms`, `--swap 180ms`, `--overlay 280ms`, `cubic-bezier(0.2, 0, 0, 1)`. `prefers-reduced-motion` still honored.

---

## 4. Component vocabulary (Approach 1)

### 4.1 Shared `ui/*` primitives — restyled in place

Old import names, old props/variants — **new visuals only**. Zero call-site edits. All 23 files under `src/components/ui/`:

| Component | New look |
|---|---|
| `Button` (all variants/sizes/shape) | 8px radius; primary = lime fill + `on-accent` caps-tracked label; secondary/outline = `border-strong`; danger = coral; press = 0.98 scale; loading spinner keeps lime |
| `Card` (+Header/Body/Footer/deprecated aliases) | 12px radius, `surface`, 1px `border`, shadow-sm; **gradient variant collapses to default**; hover-lift removed |
| `Badge`/`Tag` | 6px radius, mono caps, status tints (lime/coral/amber at 14% + bright text) |
| `Input`/`Textarea`/`Select` | boxed, `surface-raised`, `border-strong`, 8px radius; focus = lime ring |
| `Checkbox`/`Switch` | lime checked/on state, same box language |
| `Dialog`/`ConfirmDialog` | raised surface, md shadow, ink scrim (no blur), lime confirm / coral destructive |
| `Sheet` | shelf pull-out restyle: raised surface, md shadow |
| `Tabs` | lime 2px underline active, `surface` tab bar |
| `Toast` (`useToast`) | single-line bottom-center, raised surface, mono timestamp, max 3 stacked |
| `Tooltip` | raised surface, 6px radius, no arrow gimmicks |
| `Skeleton` | static `surface-raised` blocks — **shimmer animation removed** |
| `Spinner` | lime arc |
| `Progress` | lime bar, 6px radius track |
| `Avatar` | 8px radius square-ish mark (Seal language), Poppins initials |
| `EmptyState`/`states` | centered, Poppins, one lime action |
| `Divider` | 1px `border` |
| `Alert` | status tints with left 3px bar (lime/coral/amber) |
| `theme-toggle` | restyled to match ThemeSeal behavior/look |

Card gradient / `hover-lift` / `gradient-text` utility classes in `globals.css` are deleted or re-skinned to no-op equivalents so no legacy screen can render them.

### 4.2 Kitab components — same APIs, new visuals

Files in `src/components/kitab/` keep names, props, and exports (`index.ts` barrel unchanged in shape):

| Component | v3 visual notes |
|---|---|
| `Folio` (+Header/Body) | = Card look: 12px, surface, border, shadow-sm; tones map to tints (brick tone → **lime tint**, moss → keep for "correct", ochre → warning) |
| `StampButton`/`StampLink` | lime primary, `border-strong` secondary, underlined tertiary; 8px radius; caps tracking kept as signature |
| `Tag` | 6px, mono caps, status tints |
| `Seal` | 8px radius, lime-on-surface initials (or inverse) |
| `Rule`/`MastheadRule` | kept as structural utilities (1px `border` color); masthead double-rule optional ornament — used at most once per page |
| `Wayfinding`/`TitleBlock` | crumbs in `text-soft`, current in `text`, hover `accent-bright` (dark) / `accent-text` (light); Poppins 700 title |
| `Field` | **boxed** field (abandons underline-only), matches `ui/Input` |
| `Galley`/`Wire`/`Register` | restyled surfaces; Register keeps mono tabular numerals + right-aligned figures |
| `ReadingRoom`/`ExamDesk`/`PullOut`/`OverlayFolio`/`MarginCompanion`/`KitabIndex`/`QuietBar`/`ThemeSeal`/`KitabShell`/`KitabIndexClientBridge` | same structure/composition; Night Study colors, Poppins, radii, shadows |

`MarginCompanion` ten-state chip set and Safeguard banner: unchanged behavior; chips restyled (mono caps, lime/coral states).

### 4.3 Chrome

- **QuietBar**: 40px → **44px**, `surface` bg, 1px bottom border, Poppins 600 hub links, active = `accent-bright` (dark) / `accent-text` (light), Index trigger = bordered pill. Desktop-only stays.
- **KitabIndex**: raised surface, md shadow, Poppins rows, lime focus/selected row, same A–Z grouping + empty-state hubs.
- **AppShell** (legacy wrapper): gains the same 44px QuietBar (wordmark · hub links · Index ⌘K · theme) so ~90 legacy screens stop being chrome-less. Props/signature unchanged; `KitabIndexClientBridge` reuse or a thin static variant — implementation choice, visual result identical.
- **Hubs** (`app/kitab/*`): layouts and data wiring **untouched**; only component skin changes.

### 4.4 Explicitly deleted from the visual layer

Fraunces/Inter font loading · brick `#B3412E` accent role · warm-paper `#FAF7F0` ground · 2/4px radii · "no shadows ever" rule · underline-only inputs · hover-lift/gradient-card/shimmer behaviors · `accent-primary` indigo semantics from `tokens.css` (bridge tokens remap to v3 equivalents).

---

## 5. Admin → School ERP access

**Requirement:** platform admin can open School ERP from Kitab (Index → "School ERP") and use it.

**Current state (verified in code):**
- `GET /api/erp/schools` returns **all** schools for `role=admin` with `isAdmin: true` and full `permissions` (`backend/src/routes/erp/core.ts:36-74`).
- `erpGuard`/`resolveErpAccess` bypasses platform admins (`backend/src/lib/erp/acl.ts`).
- `ErpProvider.hasPermission` returns true when `activeSchool.isAdmin` — satisfied by the API payload.
- `app/school/erp/layout.tsx` blocks only when `schools.length === 0` — not expected for admin.
- Kitab Index lists "School ERP" for `isStaffSession` (admin + moderator).

**Work:**
1. **Manual/browser verification** of the full path: admin login → ⌘K → School ERP → navigate ≥2 modules (People, Classes) → confirm data loads.
2. **Fix whatever actually fails** — scope limited to the real blocker found (no speculative hardening). Known risk candidates: server-side cookie forwarding in `fetchErpSchoolsServer`, `x-school-id` header defaults, moderator confusion (moderator may legitimately get `schools: []` — acceptable).
3. **Regression spec** `tests/e2e/admin-erp-access.spec.ts`: admin reaches `/school/erp` and sees the workspace; non-staff user is refused (empty-state or redirect — assert actual behavior).
4. Kitab Index entry stays staff-gated; **no moderator special-case on the frontend** — backend is source of truth.

---

## 6. Validation gates

| # | Gate | Command / check |
|---|---|---|
| 1 | Typecheck | `npx tsc --noEmit` (frontend) |
| 2 | Lint | `npx eslint src/components app` (at least kitab + ui + foundation trees) |
| 3 | Build | `pnpm build` |
| 4 | **Contrast CI script** | node script asserting every dark pair **and** every light pair ≥ 4.5:1 (≥ 3:1 for ≥24px/700 text); fails on regression; runnable via `pnpm run check:contrast` |
| 5 | Banned-pattern sweep | no `indigo\|violet\|#6366F1` ; no `backdrop-blur\|backdrop-filter` ; no `Fraunces\|--font-fraunces` leftovers in layout ; no `#B3412E\|--brick` active as accent in kitab/ui trees ; no `hover-lift\|gradient-text` usage |
| 6 | E2E | existing kitab specs + new `admin-erp-access.spec.ts` (requires `docker:up` + migrate + seed; **fallback:** build/typecheck/lint only, as the route-state matrix permits) |

---

## 7. Delivery order (this session)

| Step | Contents | Verify |
|---|---|---|
| 1 | Tokens + fonts: rewrite `kitab-tokens.css`/`kitab-theme.css` for v3, remap legacy bridge tokens, swap `next/font` to Poppins, set dark default | build, contrast pairs |
| 2 | Restyle `src/components/ui/*` (all 23) | tsc, lint, visual spot-check |
| 3 | Restyle `src/components/kitab/*` | tsc, lint, banned sweep |
| 4 | Chrome: QuietBar/Index/ThemeSeal/hub pages polish | e2e smoke |
| 5 | AppShell gains QuietBar | tsc, lint |
| 6 | Admin→ERP verify + fix + `admin-erp-access.spec.ts` | manual path + spec |
| 7 | Contrast script + final gates | all gates green |

Commits follow this order. No backend feature work except fixes proven necessary by step 6.

---

## 8. Out of scope (unchanged open items)

- `/admin/**` `add|edit` retirement → Queue + Inspector (plan §2.3/§3.3)
- ERP "compact register" density toggle (plan §8.3)
- Playwright suite execution when Docker stack unavailable (documented fallback)
- Any IA/route/hub-content changes — **UX is frozen**
- Mobile chrome (stays chrome-less by design)

---

## 9. Success criteria

1. A user landing on any screen — hub or legacy — sees **one** coherent dark-first Poppins/lime system; no print-style flat cards, no old shadcn gradient/hover-lift, no indigo.
2. Light theme toggle renders the AA-audited light palette everywhere.
3. Admin completes School ERP round-trip from the Kitab Index; regression spec exists.
4. All six §6 gates green (E2E per fallback rule).
