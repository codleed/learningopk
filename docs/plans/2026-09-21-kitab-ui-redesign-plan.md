# Kitab — Ground-Up UI/UX Redesign Plan

**Date:** 2026-09-21 · **Scope:** `learningopk/frontend` (Next.js 16, React 19, Tailwind v4, Radix) · **Status:** Plan — no code yet

> **Kitab** (کتاب — "book") reimagines LearningoPK as a printed study workbook: paper, ink, hairline rules, and a teacher's red pen. This is a re-foundation, not a reskin — navigation model, screen composition, component vocabulary, color, and type all change.

---

## 0. Current-state fingerprint (the "banned" list)

Everything below is **explicitly prohibited** in the redesign. If any screen is recognizable against this list, it fails review.

| Layer | Current system (do not reuse) |
|---|---|
| Theme | Dark-first (`#0D0F17` blue-navy), light as secondary |
| Color | Indigo `#6366F1` primary; neon green `#22C55E`; amber `#F59E0B`; red `#EF4444`; sky `#38BDF8`; slate text scale; violet exercise accents |
| Effects | Glassmorphism (`.glass`, backdrop-blur), conic-gradient card borders, gradient text, hover-lift floats, soft diffuse shadows |
| Type | Syne (display) / DM Sans (body) / JetBrains Mono |
| Layout | Fixed **left rail** (240px/72px) + hamburger; role toggle in rail; dashboard = grid of widget cards; `max-w-[97rem]` shell |
| Components | shadcn-styled card / badge / dialog / sheet / tabs / toast / tooltip / progress-ring / shimmer skeleton vocabulary |
| Shape | Radii 6/10/16/24px, pill buttons, 4px spacing grid |
| IA | 10-item flat feature rail; two parallel curriculum trees (`/subjects/*` and `/[board]/[grade]/[subject]/*`); page-per-entity admin; AI tutor siloed on its own page; **any persistent nav chrome** (left rail, top bar, bottom tabs) |

**What legitimately survives** (behavior/infrastructure, not visuals): TanStack Query + RSC data patterns, route logic, KaTeX rendering, Radix primitives as *behavior-only* bases, auth/session model, skip-link a11y. The redesign is presentation + information architecture, not the data layer.

---

## 1. Design direction & rationale

### Direction: "The Open Workbook"

Light-first **editorial / print** aesthetic. Screens read as paper documents: warm off-white ground, near-black warm ink, structure from **hairline rules and typography** rather than colored containers. One brand accent — **brick red**, the teacher's marking pen — reserved for action and annotation. Numbers, dates, and code set in mono, like entries in a register.

Three signature motifs make the identity unmistakable:

1. **The masthead rule** — a newspaper-style double rule (3px ink line over 1px line) under the top bar and page titles.
2. **The stamp** — primary CTAs and status confirmations are solid brick rectangles with letter-spaced caps labels, like a rubber stamp.
3. **The margin** — notes, hints, and the AI companion live in the page margin, like pencil marginalia in a textbook.

### Why this direction (rationale)

- **Product fit.** LearningoPK is reading-dense: chapters, formulas, past papers, worked solutions. Book typography and a 66–70ch measure are functionally better for comprehension than a dashboard-card vernacular.
- **Audience fit.** Target users are largely on mid/low-end Android devices and variable connections. An ink-on-paper system is nearly shadow/blur-free → cheap to render, legible in sunlight, and prints well (past papers are literally printed).
- **Cultural resonance.** The red-ink mark, the attendance register, the exam "marks sheet" are instantly familiar metaphors for Pakistani students, teachers, and school administrators.
- **Forced departure.** Dark-navy + indigo + glass is the current identity's core; a light, warm, serif-led system cannot be mistaken for it at any zoom level.
- **One system, three products.** Student learning, the school ERP, and the admin console all speak "records and documents" — ledger tables, queues, stamps — so one design language covers all three without per-area forks.

### Interaction philosophy

- **Search/command-first navigation.** The Index (`⌘K`) is the primary way to move; visible nav is a 5-hub skeleton. Browsing the tree is the fallback, not the spine.
- **Press, don't float.** No hover-lift. Interaction feedback is a 1px "press" (translateY) and ink-state changes, 120–150ms. The UI feels set in type, not hovering over the page.
- **Margin over modal.** Secondary thought (AI help, notes, hints) appears in a margin panel; modals are reserved for irreversible confirms.
- **Honest ink.** Confidence, streaks, and AI states are stated in words/marks, never implied by decoration. (Per the agent pipeline skill: AI confidence is shown only where actually measured.)


---

## 2. Information architecture & layout restructuring

This is a rearrangement, not a restyle: the left rail is deleted, the widget-grid dashboard is dissolved, the two parallel curriculum trees are merged, and admin/ERP move from page-per-entity to queue + inspector.

### 2.1 Student experience — five hubs + companion

| Hub | Route | Replaces / merges | Contents |
|---|---|---|---|
| **Today** | `/today` | `/dashboard`, `/calendar`, `/review` entry | Dated "front page": masthead with date, day plan, continue-reading ribbon, review-due count, attendance-register strip |
| **Library** | `/library` | `/subjects/*` + `/[board]/[grade]/[subject]/*` (merged into one tree), `/formulas` | Bookshelf of boards → grades → subject *volumes* → chapter *spreads*; formulas become a per-subject appendix, not a top-level section |
| **Practice** | `/practice` | `/past-papers/*`, chapter quizzes, `/patterns`, flashcards, `/review` deck | Mode switcher: **Drill** (quizzes/flashcards), **Exam desk** (timed past papers), **Review deck** (spaced repetition), **Patterns** (past-paper analysis) |
| **Community** | `/community` | `/forum/*`, study groups, `/leaderboard` | Single discussion feed + groups + merit board |
| **Records** | `/records` | `/stats`, `/notes`, `/settings` | "Report card" (stats), notebook index (all marginalia), account settings |

**AI tutor** stops being a destination page. It becomes the **Margin Companion**: a collapsible margin panel available on every Library/Practice screen, with `/companion` holding full conversation history. Context chips (`ai-context-chip`) become "currently reading: Chapter 3" margin captions.

### 2.2 Navigation skeleton — chrome-less, content-first

The rail is not replaced by another persistent bar; **navigation itself is demoted**. Most screen real estate belongs to content. Three mechanisms, in priority order:

1. **The Index (`⌘K` / long-press)** — a full-screen overlay that *is* the app's primary navigation. Fuzzy-jump to any screen, chapter, past paper, or action ("attempt 2023 Physics paper", "mark attendance"). First-run users are taught it with an inline hint on Today; power users never touch anything else.
2. **In-content wayfinding** — breadcrumbs-as-text ("Library › Physics › Ch. 3") rendered as part of the page title block, with each crumb clickable. Structure lives in the document, not in a gutter.
3. **A 40px quiet bar** (desktop) — wordmark left; a single "Go to…" button that opens the Index; avatar right. On mobile: no top bar at all — the page owns the screen, with the Index reachable via pull-down gesture and a floating book-tab in the corner. Hubs are *not* permanently displayed; they're the Index's top-level sections, shown as large serif entries when the palette opens empty.

This makes the redesign *more* radical than a tab-bar swap: the persistent-chrome mental model (rail → tabs) is abandoned entirely. Deep-linking, breadcrumbs, and search carry orientation — the same way a book uses its table of contents and index rather than a visible shelf label on every page.

### 2.3 Screen composition changes (representative)

| Screen | From | To |
|---|---|---|
| Dashboard → **Today** | Grid of 8+ widget cards (streak-xp, quick actions, activity…) | Single 680px agenda column: date masthead, plan list, continue ribbon, register strip. No card grid anywhere |
| Chapter → **Reading room** | App page with sidebar-ish sections and color-coded exercise blocks | Book spread: centered 66–70ch serif measure, fold-out table of contents (overlay, not sidebar), marginalia column on ≥1280px, problem sets as numbered sections |
| Past paper → **Exam desk** | Web form | A paper sheet on a desk: mono tabular timer, numbered question grid, mark scheme revealed as an appendix |
| Admin → **Console** | Sidebar tree of ~20 pages, add/edit page per entity | Queue + inspector: 320px triage list (keyboard-navigable) beside a detail inspector; edits happen inline in the inspector, no `*/add` `*/edit` routes |
| School ERP → **School OS** | Separate shell, deep sidebar (HRM/CRM/finance/academics/approvals) | Module tabs under one masthead (People · Classes · Money · Intake · Approvals); every module is a ledger table + inspector; approvals remain an explicit queue with a visible audit trail (human-on-the-loop: the check is shown in the record, not hidden) |

### 2.4 Route policy

Old routes 301-redirect to hub routes for one release (e.g. `/dashboard` → `/today`, `/formulas` → `/library/[subject]#appendix`). Redirect map ships with the redesign PR; no orphaned URLs.


---

## 3. Component inventory (new vocabulary)

Naming is deliberately fresh — no component carries its old name. Radix/vaul remain as *behavior* bases only; every visual is new. All live under `src/components/kitab/`.

### 3.1 Chrome & navigation

| New | Replaces | Purpose |
|---|---|---|
| **Index** (command palette, full-screen) | LeftRail + role toggle + Masthead + hamburger | ⌘K searchable jump-to-anything; the *primary* navigation. Opens on the five hubs as large serif entries, then drills by recents, pins, and fuzzy search |
| **QuietBar** | LeftRail/header | 40px desktop strip: wordmark · "Go to…" (opens Index) · avatar. Mobile: no bar; pull-down gesture + floating book-tab instead |
| **Wayfinding** (breadcrumbs-as-text) | Sidebar highlight + breadcrumbs.tsx | "Library › Physics › Ch. 3" in the page title block; every crumb clickable; carries orientation without any persistent chrome |
| **Contents** | Tabs, sheet-based drawer nav | Underline-rule tab row; also the fold-out chapter TOC |

### 3.2 Paper primitives

| New | Replaces | Purpose |
|---|---|---|
| **Folio** | Card | Hairline-bordered paper panel; no shadow, no glass, ≤4px radius |
| **StampButton** | Button | Primary = solid brick w/ caps label; secondary = ink outline; tertiary = underlined ink link. Press = 1px translate |
| **Tag** | Badge | Rectangular 2px-radius label, mono caps; semantic tints only for status, never decoration |
| **Seal** | Decorated Avatar | Square-stamp identity mark; initials set in mono on ink |
| **Rule** | Divider | Hairline, double-rule, and "scissor" (dashed cut) variants |
| **Field** | Input/Select/Checkbox/Switch/Textarea | Underline-only inputs (bottom rule, no box); Tick (checkbox), Lever (switch) share the ink/border language |
| **OverlayFolio** | Dialog | Modal reserved for irreversible actions; ink scrim, paper panel, masthead rule inside |
| **PullOut** | Sheet (vaul) | Bottom drawer, restyled as a shelf pull-out |
| **MarginNote** (tooltip) | Tooltip | Ink-black small note; always paired with underline-dotted trigger |
| **Wire** (toast) | Toast | Single-line bottom-center notices, mono timestamps, stack max 3 |
| **BlankPage** (empty state) | Empty-state | Centered ink illustration made of rules + a one-line suggestion |
| **Galley** (skeleton) | Shimmer skeleton | Ruled-line placeholders (like galleys before print); no shimmer animation |
| **BookmarkRibbon** | Progress ring / continue-learning card | Vertical ribbon showing % of volume read; continues reading strip on Today |

### 3.3 Domain components

| New | Replaces | Purpose |
|---|---|---|
| **Agenda** | Dashboard widget grid | Single-column day plan: dated entries, review-due block, continue ribbon |
| **Register** | streak-counter, xp-toast, confetti | Attendance-register streak grid with daily ink stamps; XP renamed **Marks** (report-card numerals) |
| **ReadingRoom** | Chapter page layout | Serif measure column + fold-out TOC + Marginalia column |
| **Marginalia** | Notes widgets | Margin-anchored notes/highlights; syncs to Records → notebook index |
| **ProblemSet** | Color-coded exercise-section cards | Numbered sections (I, II, III) with roman-numeral headers; no per-type accent colors |
| **ExamDesk** | Past-paper attempt/view pages | Paper sheet + mono timer + numbered question grid + mark-scheme appendix |
| **LedgerTable** | Admin/ERP data tables | Hairline rows, sticky first column, tabular mono numerals, inline inspector open |
| **Inspector** | `*/add`, `*/edit` pages | Side/bottom detail pane for create-edit-view with inline validation |
| **Queue** | Moderation/approvals list pages | Triage list with keyboard nav, bulk stamp actions, audit-trail footer |
| **MarginCompanion** | ai-unified-chat page + components | Collapsible AI panel on learning screens; full history at `/companion` |

### 3.4 MarginCompanion states (required set)

Per the agent-pipeline skill, the AI surface implements all ten states as **state chips** (mono caps, ink or brick), with confidence shown **only where actually measured**:

`idle` · `listening` · `planning` · `tool-running` · `streaming-partial` · `awaiting-verification` · `needs-clarification` · `error-retry` · `cancelled` · `done-with-caveats`

`awaiting-verification` appears when the tutor proposes a write-class action (e.g., "add this to your revision deck") — the payload and a one-tap undo are shown in the margin before it commits. The crisis banner returns as **Safeguard**, a full-width rule-flanked notice.

### 3.5 Deleted outright

LeftRail (+ config/types/toggle), `.glass`/`.glass-sm`, gradient-border cards, `hover-lift`, gradient-text, progress-ring, confetti-celebration, dashboard widget family, per-entity admin pages. Nothing migrates visually.


---

## 4. Color palette

Warm paper + warm ink + one brick accent. Every hex below was chosen against the banned list in §0 — no blue-navy grounds, no indigo/violet/sky hues anywhere, and **no "AI-generated" purple-indigo gradient schemes**: hues with a wavelength between blue and purple (indigo, violet, periwinkle, lavender, lilac) are banned outright from the token set, chart ramps, focus rings, and illustrations. The palette is earth-toned: brick, moss, ochre, plum, warm grays.

### Ink & paper (light-first)

| Token | Light (default) | Dark ("night reading") | Rationale |
|---|---|---|---|
| `paper` | `#FAF7F0` | `#1C1A17` | Warm off-white ground — deliberately not the cold slate/blue `#0D0F17`–`#F8FAFC` family |
| `paper-raised` | `#FFFDF8` | `#26231F` | One elevation step only; used for overlays and folios on textured ground |
| `ink` | `#211D16` | `#EDE6DA` | Near-black **warm** brown ink, not slate `#0F172A`/`#F1F5F9` |
| `ink-soft` | `#5D5748` | `#B3AA9B` | Secondary text — warm umber, not slate `#475569`/`#94A3B8` |
| `ink-faint` | `#8A8272` | `#7D766A` | Tertiary/captions |
| `hairline` | `#DCD5C8` | `#3B3730` | Structure — borders are warm gray, never white-alpha |
| `brick` | `#B3412E` | `#D96B52` | **The** accent — teacher's red pen. Action, active tab, stamps, links. Not indigo `#6366F1`/`#4F52E8`, not Tailwind red `#EF4444` |
| `brick-tint` | `rgba(179,65,46,.08)` | `rgba(217,107,82,.14)` | One-step highlight wash for active rows/targets |
| `moss` | `#5F6F52` | `#93A887` | Success/correct — muted moss green, not neon `#22C55E` |
| `ochre` | `#B07D2B` | `#D3A95C` | Warning/due-soon — ochre, not amber `#F59E0B` |
| `plum` | `#6E4A6E` | `#A98BA9` | Error alt/severity — plum replaces red-as-error for dedup with brick (see below) |
| `graphite` | `#3E3A33` | `#C9C1B4` | Mono numerals, timers, code |

**Brick is reserved**: buttons, active nav, primary links, stamps. Errors use **plum** so the marking-pen color never reads as "something broke." Only six hue roles total; no chart rainbow — charts use ink + brick + tints of them.

### Accessibility & contrast (WCAG 2.1 AA, AAA where free)

- `ink` on `paper` ≈ **13.9:1**; `ink-soft` on `paper` ≈ **6.0:1** (AA for body, AAA for large text); `ink-faint` reserved for ≥14px captions only.
- `brick` on `paper` ≈ **5.4:1** — AA for text; white-on-brick stamps ≈ **4.6:1** (AA large/bold caps).
- Dark theme pairs are adjusted individually (e.g. `#D96B52` on `#1C1A17` ≈ 5.1:1); no token is reused across themes without re-checking.
- Contrast is never carried by hue alone — state pairs an underline, weight, or mark (✓/!/·) with color, for color-blind safety.
- `prefers-reduced-motion` honored globally; focus = 2px brick underline offset, never outline-color tricks.

---

## 5. Typography system

Full replacement of the Syne/DM Sans/JetBrains stack. Pairing: **Fraunces + Inter + IBM Plex Mono** (via `next/font/google`, self-hosted like today's setup).

| Role | Face | Rationale |
|---|---|---|
| **Display / body-serif** | **Fraunces** (600, 500; optical size axis) | Warm, ink-y old-style serif with "wonk" — bookish without being stiff; the single strongest visual break from geometric Syne |
| **UI sans** | **Inter** (400, 500, 600) | Neutral workhorse for controls, tables, and dense ERP/admin UI where serif would fight legibility at small sizes |
| **Numerals & code** | **IBM Plex Mono** (400, 500) | Register/typewriter character for marks, timers, attendance, code blocks — replaces JetBrains Mono's terminal flavor |

### Scale (1.25 ratio; clamp for fluid display sizes)

| Token | Size | Face/weight | Use |
|---|---|---|---|
| `display` | clamp(2.5rem → 3.25rem) | Fraunces 600 | Landing/hub hero, date mastheads |
| `title` | 1.75rem / 2.25rem | Fraunces 600 | Page titles |
| `heading` | 1.25rem / 1.75 | Fraunces 600 | Section heads, folio titles |
| `subhead` | 1rem / 1.5 | Inter 600 | Card heads, table headers (caps, tracked) |
| `body` | 1rem / 1.6 | Fraunces 500 (reading) / Inter 400 (UI) | Body copy |
| `caption` | 0.8125rem / 1.4 | Inter 400 | Captions, helper text |
| `data` | 0.875rem | IBM Plex Mono 400/500 | Numerals, timers, IDs, code |

**Weight discipline:** max three weights per face; no italic except quotations; **stamps are always caps + 0.08em tracking** — that letter-spacing *is* the "stamped" look, not a heavier weight. Fraunces is loaded with `display: swap` and the `SOFT`/`WONK` axes fixed at build.


---

## 6. Spacing & grid system

### 6.1 Base unit

**8px base** (current UI uses 4px — a deliberate departure). Scale is 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Odd 20/40/80 steps are removed from the vocabulary; when a design needs 20, it uses 16 or 24.

### 6.2 Layout grid

| Breakpoint | Columns | Gutter | Margin | Content max |
|---|---|---|---|---|
| `<640` | 4 | 16 | 16 | fluid |
| `640–1023` | 8 | 24 | 24 | fluid |
| `1024–1279` | 12 | 24 | 32 | 1152 |
| `≥1280` | 12 | 32 | 40 | **1152 + margin column** |

The 1280px+ "margin column" (≈280px) is the signature structural move: reading measures cap at **66–70ch** in the left 8 columns; Marginalia, MarginCompanion, and hints occupy the right column. Below 1280, margin content collapses into inline PullOuts.

### 6.3 Structural constants

| Token | Value | Replaces |
|---|---|---|
| `--quietbar-h` | 40px | `--header-height: 60px`, `--sidebar-width`, `--left-rail-width` |
| `--page-max` | 1152px | `max-w-[97rem]` (1552px) |
| `--measure-reading` | 68ch | n/a |
| `--foliage-pad` | 24px | card padding 16/20 |
| `--radius-*` | **2 / 4px** (folio 4, tags/stamps 2, inputs 0) | 6/10/16/24px radii |
| `--rule` | 1px hairline; 3px+1px double for mastheads | soft borders + shadows |

**Elevation is replaced by rules**: no box-shadow tokens at all. Overlays get a hairline border + 2% ink scrim; active folios get a 2px ink left-rule, not a glow.

### 6.4 Motion

- Durations: **120ms** (press/tick), **180ms** (state swaps), **280ms** (overlay enter/exit). Easing `cubic-bezier(0.2, 0, 0, 1)`.
- No transforms except the 1px press and overlay fade/slide-8px. No hover-lift, no shimmer, no confetti, no pulse.

---

## 7. Delivery approach & validation

### 7.1 Build order (suggested PRs)

1. **Tokens + fonts** — `src/components/kitab/tokens.css`, new `next/font` set, dark-theme pair audit. Old tokens remain until the cutover PR.
2. **Primitives** — Folio, StampButton, Tag, Rule, Field, OverlayFolio, Wire, Galley, BlankPage (with Storybook-style `/design` route preview page).
3. **Chrome** — QuietBar, Index (⌘K), Wayfinding, new route group `(hub)` layouts; delete LeftRail.
4. **Hubs** — Today, Library (merged tree + redirects), Practice, Community, Records.
5. **Console & School OS** — Queue + Inspector + LedgerTable; retire `*/add|edit` routes.
6. **MarginCompanion** — margin panel + `/companion`, with the ten-state chip set and Safeguard banner.

### 7.2 Validation gates (machine-checked where possible)

- **Contrast CI:** script asserts every light/dark token pair ≥ 4.5:1 (≥ 3:1 for large text) — runs in CI, fails the PR on regression.
- **E2E:** extend Playwright smoke specs to hub routes; add an a11y pass (keyboard-only Index navigation, focus order).
- **"Unrecognizability" review:** a visual diff against the §0 banned list — any indigo hex, left rail, glass blur, or Syne headline in a screenshot fails review.
- **Perf budget:** no new blur/backdrop-filter anywhere; LCP on Today ≤ current dashboard baseline (there are existing perf e2e specs to extend).

---

## 8. Open decisions (flagging, not blocking)

1. **`next/font` Fraunces axes** — variable font includes SOFT/WONK axes; pin them at build or drop to static weights for a smaller payload. Recommend static 500/600.
2. **Dark theme rollout** — recommend shipping light-only first, adding "night reading" in a fast-follow so contrast pairs ship pre-audited rather than half-checked.
3. **ERP table density** — clerks may want a "compact register" toggle (16px rows vs 24px); decide during Console PR with real usage data.
4. **Redirect map ownership** — resolved at cutover (2026-09-21): `routes-mcp` is a backend API route linter/listing tool and owns no frontend URLs; the §2.4 301 table shipped in `frontend/next.config.ts` with exact-match sources only (deep routes — admin CRUD, ERP, past papers, `/subjects/[subject]` — stay direct).

---

*End of plan. Implementation begins with PR 1 (tokens + fonts) upon approval.*




