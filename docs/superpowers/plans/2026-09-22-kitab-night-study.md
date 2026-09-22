# Kitab v3 "Night Study" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Parallel note:** Tasks 2, 3, 4, 5, 6 are mutually independent after Task 1 lands — dispatch them as parallel subagents. Task 7 runs after all others.

**Goal:** Replace Kitab v2 (warm paper/brick/Fraunces) with the approved "Night Study" system — dark-first Poppins/lime with glass QuietBar — by restyling tokens + all `ui/*` primitives + all `kitab/*` components in place, adding an admin→ERP regression spec and a contrast CI script.

**Architecture:** Single token layer (`kitab-tokens.css` dark-by-default, `tokens.css` remapped to `var()` indirection) feeds both component trees (`src/components/ui/*` legacy names, `src/components/kitab/*` Kitab names) via Tailwind v4 `@theme`. No call-site edits; no IA/UX changes. Theme: `:root` = dark, `.light` class = light (next-themes already defaults `dark`).

**Tech Stack:** Next.js 16, React 19, Tailwind v4, CVA, next/font (Poppins + IBM Plex Mono), Playwright, Node contrast script.

**Spec:** `docs/superpowers/specs/2026-09-22-kitab-night-study-design.md` (§ references below point there).

**Working dir for all commands:** `learningopk/frontend` unless noted.

---

## File map

| Action | Path | Task |
|---|---|---|
| Rewrite | `src/design-system/kitab-tokens.css` | 1 |
| Rewrite | `src/design-system/kitab-theme.css` | 1 |
| Rewrite | `src/design-system/tokens.css` | 1 |
| Edit | `app/layout.tsx` (fonts) | 1 |
| Edit | `app/globals.css` (delete hover-lift/gradient-text/shimmer uses OK to keep defs removed) | 1 |
| Edit | `src/lib/theme.ts` + `src/components/kitab/theme-seal.tsx` | 1 |
| Restyle (23) | `src/components/ui/*.tsx` | 2 |
| Restyle (19) | `src/components/kitab/*.tsx` (not `index.ts` API) | 3 |
| Edit | `src/components/foundation/app-shell.tsx` | 4 |
| Create | `tests/e2e/admin-erp-access.spec.ts` | 5 |
| Create | `scripts/check-contrast.mjs` + `package.json` script | 6 |
| Verify | all gates | 7 |

---

### Task 1: Tokens, fonts, dark-default theme (BLOCKING — everything depends on this)

**Files:**
- Rewrite: `src/design-system/kitab-tokens.css`
- Rewrite: `src/design-system/kitab-theme.css`
- Rewrite: `src/design-system/tokens.css`
- Modify: `app/layout.tsx`
- Modify: `src/lib/theme.ts`
- Modify: `src/components/kitab/theme-seal.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1.1: Replace `kitab-tokens.css` with the v3 palette (dark default)**

```css
/* Kitab v3 — "Night Study" tokens. Dark default; `.light` overrides. Spec §3. */
:root {
  --paper: #131211;
  --paper-raised: #1c1a17;
  --paper-dim: #24211d;
  --ink: #ede6da;
  --ink-soft: #b3aa9b;
  --ink-faint: #8a8272;
  --hairline: #35312b;
  --hairline-strong: #4a453c;

  --accent: #9ad42e;
  --accent-bright: #b7f04a;
  --on-accent: #141611;
  --accent-tint: rgba(154, 212, 46, 0.14);
  --accent-tint-strong: rgba(154, 212, 46, 0.24);
  /* back-compat names used across kitab/ui trees */
  --brick: var(--accent);
  --brick-deep: var(--accent-bright);
  --brick-tint: var(--accent-tint);
  --brick-tint-strong: var(--accent-tint-strong);
  --brick-contrast: var(--on-accent);

  --danger: #f07178;
  --danger-tint: rgba(240, 113, 120, 0.14);
  --warning: #fbbf24;
  --warning-tint: rgba(251, 191, 36, 0.14);
  --moss: var(--accent);          /* success == accent, spec §3.2 */
  --moss-deep: var(--accent-bright);
  --moss-tint: var(--accent-tint);
  --ochre: var(--warning);
  --ochre-tint: var(--warning-tint);
  --plum: var(--danger);          /* errors were plum; now coral */
  --plum-tint: var(--danger-tint);

  --graphite: #c9c1b4;

  /* legacy bridge → v3 */
  --bg-base: var(--paper);
  --bg-surface: var(--paper-raised);
  --bg-elevated: var(--paper-dim);
  --bg-subtle: var(--paper-dim);
  --text-primary: var(--ink);
  --text-secondary: var(--ink-soft);
  --text-muted: var(--ink-faint);
  --text-inverse: var(--on-accent);
  --border-default: var(--hairline);
  --border-strong: var(--hairline-strong);
  --accent-primary: var(--accent);
  --accent-primary-hover: var(--accent-bright);
  --accent-primary-light: var(--accent-tint);
  --accent-primary-fg: var(--on-accent);
  --accent-success: var(--accent);
  --accent-success-light: var(--accent-tint);
  --accent-warning: var(--warning);
  --accent-warning-light: var(--warning-tint);
  --accent-danger: var(--danger);
  --accent-danger-light: var(--danger-tint);
  --accent-info: var(--graphite);
  --accent-info-light: rgba(201, 193, 180, 0.14);

  --radius-tag: 6px;
  --radius-folio: 12px;
  --radius-btn: 8px;
  --radius-seal: 8px;
  --radius-0: 0px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.35);
  --shadow-card: var(--shadow-sm);
  --shadow-elevated: 0 24px 48px rgba(0, 0, 0, 0.55);
  --shadow-md: var(--shadow-elevated);

  --quietbar-h: 44px;
  --page-max: 1152px;
  --measure-reading: 68ch;
  --kitab-page-pad: 24px;

  --press: 120ms;
  --swap: 180ms;
  --overlay: 280ms;
  --ease-kitab: cubic-bezier(0.2, 0, 0, 1);
}

/* Light ("day reading") — spec §3.3 */
:root.light,
.light {
  --paper: #f6f6f7;
  --paper-raised: #ffffff;
  --paper-dim: #ffffff;
  --ink: #111113;
  --ink-soft: #52525b;
  --ink-faint: #71717a;
  --hairline: #e4e4e7;
  --hairline-strong: #d4d4d8;

  --accent: #9ad42e;
  --accent-bright: #4a6b0a;       /* lime text on white fails AA; see spec §3.3 */
  --on-accent: #141611;
  --accent-tint: rgba(74, 107, 10, 0.1);
  --accent-tint-strong: rgba(74, 107, 10, 0.18);
  --brick: var(--accent);
  --brick-deep: var(--accent-bright);
  --brick-tint: var(--accent-tint);
  --brick-tint-strong: var(--accent-tint-strong);
  --brick-contrast: var(--on-accent);

  --danger: #dc2626;
  --danger-tint: rgba(220, 38, 38, 0.1);
  --warning: #b45309;
  --warning-tint: rgba(180, 83, 9, 0.1);
  --moss: var(--accent);
  --moss-deep: var(--accent-bright);
  --moss-tint: var(--accent-tint);
  --ochre: var(--warning);
  --ochre-tint: var(--warning-tint);
  --plum: var(--danger);
  --plum-tint: var(--danger-tint);

  --graphite: #3f3f46;

  --bg-base: var(--paper);
  --bg-surface: var(--paper-raised);
  --bg-elevated: var(--paper-dim);
  --bg-subtle: var(--paper-dim);
  --text-primary: var(--ink);
  --text-secondary: var(--ink-soft);
  --text-muted: var(--ink-faint);
  --text-inverse: var(--on-accent);
  --border-default: var(--hairline);
  --border-strong: var(--hairline-strong);
  --accent-primary: var(--accent);
  --accent-primary-hover: var(--accent-bright);
  --accent-primary-light: var(--accent-tint);
  --accent-primary-fg: var(--on-accent);
  --accent-success: #4a6b0a;
  --accent-success-light: var(--accent-tint);
  --accent-warning: var(--warning);
  --accent-warning-light: var(--warning-tint);
  --accent-danger: var(--danger);
  --accent-danger-light: var(--danger-tint);
  --accent-info: var(--graphite);
  --accent-info-light: rgba(63, 63, 70, 0.1);

  --shadow-sm: 0 1px 2px rgba(17, 17, 19, 0.06), 0 8px 24px rgba(17, 17, 19, 0.08);
  --shadow-card: var(--shadow-sm);
  --shadow-elevated: 0 24px 48px rgba(17, 17, 19, 0.16);
  --shadow-md: var(--shadow-elevated);
}
```

- [ ] **Step 1.2: Replace `kitab-theme.css` bridge**

```css
/* Kitab v3 — Tailwind v4 bridge. Fonts from next/font vars. */
@theme inline {
  --color-paper: var(--paper);
  --color-paper-raised: var(--paper-raised);
  --color-paper-dim: var(--paper-dim);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-hairline: var(--hairline);
  --color-hairline-strong: var(--hairline-strong);

  --color-accent: var(--accent);
  --color-accent-bright: var(--accent-bright);
  --color-on-accent: var(--on-accent);
  --color-accent-tint: var(--accent-tint);
  --color-brick: var(--brick);
  --color-brick-deep: var(--brick-deep);
  --color-brick-tint: var(--brick-tint);
  --color-brick-tint-strong: var(--brick-tint-strong);
  --color-brick-contrast: var(--brick-contrast);

  --color-danger: var(--danger);
  --color-danger-tint: var(--danger-tint);
  --color-moss: var(--moss);
  --color-moss-deep: var(--moss-deep);
  --color-moss-tint: var(--moss-tint);
  --color-ochre: var(--ochre);
  --color-ochre-tint: var(--ochre-tint);
  --color-plum: var(--plum);
  --color-plum-tint: var(--plum-tint);
  --color-graphite: var(--graphite);

  --font-display: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
  --font-ui: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
  --font-data: var(--font-plex-mono), ui-monospace, monospace;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;

  --radius-tag: 6px;
  --radius-btn: 8px;
  --radius-folio: 12px;
  --radius-seal: 8px;

  --container-page: 1152px;

  --text-caption: 0.8125rem;
  --text-caption--line-height: 1.5;
  --text-data: 0.875rem;
  --text-data--line-height: 1.45;
  --text-body: 1rem;
  --text-body--line-height: 1.6;
  --text-subhead: 1rem;
  --text-subhead--line-height: 1.5;
  --text-heading: 1.25rem;
  --text-heading--line-height: 1.4;
  --text-title: 1.75rem;
  --text-title--line-height: 1.2;
  --text-display: 2.5rem;
  --text-display--line-height: 1.1;
  --text-display-xl: 3.25rem;
  --text-display-xl--line-height: 1.05;
}

@layer base {
  html {
    background-color: var(--paper);
    font-family: var(--font-ui);
    font-size: 16px;
  }
  body {
    background-color: var(--paper);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-ui);
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  h1 { letter-spacing: -0.03em; }
  .tnum {
    font-family: var(--font-data);
    font-feature-settings: "tnum";
  }
  .overline {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  :focus-visible {
    outline: 2px solid var(--accent-bright);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 1.3: Rewrite `tokens.css` as pure `var()` indirection (kills indigo/conic at the source)**

Replace the entire file with:

```css
/* Legacy token layer — now indirection into Kitab v3. No hex literals. */
:root,
:root[class~="dark"],
:root[class~="light"] {
  --bg-base: var(--bg-base);            /* defined by kitab-tokens; self-ref harmless */
  --accent-primary: var(--accent-primary);
  --text-primary: var(--text-primary);
  --border-default: var(--border-default);

  --shadow-card: var(--shadow-card);
  --shadow-elevated: var(--shadow-elevated);
  --shadow-sm: var(--shadow-sm);

  --chart-1: var(--accent);
  --chart-2: var(--danger);
  --chart-3: var(--warning);
  --chart-4: var(--graphite);
  --chart-5: var(--ink-soft);

  --sidebar-bg: var(--paper);
  --sidebar-border: var(--hairline);

  --card-gradient: var(--hairline); /* conic gradient removed — Card gradient variant dies */

  --exercise-long: var(--accent);
  --exercise-long-light: var(--accent-tint);
  --exercise-long-border: var(--hairline-strong);
  --exercise-long-bg: var(--accent-tint);
  --exercise-short: var(--danger);
  --exercise-short-light: var(--danger-tint);
  --exercise-short-border: var(--hairline-strong);
  --exercise-short-bg: var(--danger-tint);
  --exercise-blanks: var(--warning);
  --exercise-blanks-light: var(--warning-tint);
  --exercise-blanks-border: var(--hairline-strong);
  --exercise-blanks-bg: var(--warning-tint);
  --exercise-physics: var(--graphite);
  --exercise-physics-light: rgba(201, 193, 180, 0.12);
  --exercise-physics-border: var(--hairline-strong);
  --exercise-physics-bg: rgba(201, 193, 180, 0.06);
}
```

(Note: the self-referential `--x: var(--x)` lines are delete-eligible if the bundler warns — the safe minimal version keeps only the NEW names: charts, sidebar, card-gradient, exercise-*. Prefer that minimal version in implementation: **only define keys kitab-tokens does not already define**.)

- [ ] **Step 1.4: Swap fonts in `app/layout.tsx`**

Replace import + consts + body className:

```tsx
import { IBM_Plex_Mono, Poppins } from "next/font/google";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});
```

Body: `className={`${poppins.variable} ${plexMono.variable} antialiased`}`. Delete Fraunces/Inter imports and consts. Keep `ThemeProvider defaultTheme="dark"` as-is.

- [ ] **Step 1.5: Make `src/lib/theme.ts` dark-default with `.light` class**

```ts
export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "learningopk-theme";

export const themeInitScript = `(() => {
  const root = document.documentElement;
  try {
    const stored = window.localStorage.getItem("${THEME_STORAGE_KEY}");
    const theme = stored === "light" ? "light" : "dark";
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
})();`;

export const getResolvedTheme = (): AppTheme => {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
};

export const applyTheme = (theme: AppTheme): void => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
};
```

- [ ] **Step 1.6: Update `theme-seal.tsx` labels + classes**

Change only the button className and labels:

```tsx
className="rounded-[6px] border border-hairline-strong px-2 py-1 text-caption text-ink-soft hover:border-accent hover:text-accent"
aria-label={isDark ? "Switch to day (light) mode" : "Switch to night (dark) mode"}
{isDark ? "Day" : "Night"}
```

Keep the `useSyncExternalStore` mechanics untouched. `isDark` must read `!classList.contains("light") && classList.contains("dark")` OR simply `!classList.contains("light")` — use `!document.documentElement.classList.contains("light")` for server snapshot `false`→ treat as dark: server snapshot becomes `true` (dark default). Update `useSyncExternalStore` server snapshot to `true`.

- [ ] **Step 1.7: `app/globals.css` — remove banned utilities**

Delete the `.hover-lift` and `.hover-lift:hover` rules and the `.gradient-text` rule. Delete `@keyframes shimmer` + `.animate-shimmer` (skeleton shimmer banned). Keep all other keyframes (AI streaming dots etc. are behavior, not banned). Leave `@import` order unchanged.

- [ ] **Step 1.8: Verify Task 1**

Run:
```
npx tsc --noEmit
npx eslint src/design-system src/lib/theme.ts src/components/kitab/theme-seal.tsx app/layout.tsx
pnpm build
```
Expected: all exit 0. Also grep check: `Select-String -Path app/layout.tsx -Pattern "Fraunces|Inter"` → no matches.

- [ ] **Step 1.9: Commit**

```bash
git add src/design-system app/layout.tsx src/lib/theme.ts src/components/kitab/theme-seal.tsx app/globals.css
git commit -m "feat(kitab): v3 Night Study tokens, Poppins fonts, dark-default theme"
```

---

### Task 2: Restyle `src/components/ui/*` (23 files) — PARALLEL after Task 1

**Files:** all of `src/components/ui/*.tsx`. Props/exports/CVA variant *names* unchanged. Only class strings + a few dead variants change.

- [ ] **Step 2.1: `button.tsx` — variant class maps (replace the `variantStyles`/`sizeStyles` bodies inside `buttonVariants`)**

```ts
variant: {
  primary: ["bg-accent text-on-accent hover:bg-accent-bright shadow-[var(--shadow-sm)] active:scale-[0.98]"].join(" "),
  secondary: ["bg-bg-surface text-text-primary border border-border-strong hover:bg-bg-elevated active:scale-[0.98]"].join(" "),
  ghost: ["text-text-secondary hover:bg-accent-tint hover:text-text-primary"].join(" "),
  danger: ["bg-danger text-white hover:opacity-90 active:scale-[0.98]"].join(" "),
  success: ["bg-accent text-on-accent hover:bg-accent-bright active:scale-[0.98]"].join(" "),
  outline: ["border border-border-strong text-text-primary bg-transparent hover:bg-bg-elevated"].join(" "),
},
size: {
  xs: "h-7 px-2.5 text-xs rounded-[6px]",
  sm: "h-8 px-3 text-xs rounded-[8px]",
  md: "h-10 px-4 text-sm rounded-[8px]",
  lg: "h-12 px-6 text-base rounded-[8px]",
  xl: "h-14 px-8 text-lg rounded-[8px]",
},
```

Focus ring: replace `ring-accent-primary/40` with `ring-accent/50`. Remove `focus-visible:ring-offset-2` color issues by keeping offset but `ring-offset-bg-base`. Press: keep existing `active:scale-[0.97]` OR normalize to `[0.98]` — normalize to `0.98`.

- [ ] **Step 2.2: `card.tsx` — one visual style**

```ts
default: ["bg-bg-surface border border-border-default rounded-[12px] shadow-[var(--shadow-sm)] hover:border-border-strong"].join(" "),
elevated: ["bg-bg-surface border border-border-default rounded-[12px] shadow-[var(--shadow-md)]"].join(" "),
bordered: ["bg-bg-surface border border-border-strong rounded-[12px] shadow-[var(--shadow-sm)]"].join(" "),
gradient: ["bg-bg-surface border border-border-default rounded-[12px] shadow-[var(--shadow-sm)]"].join(" "),
```

In `Card`, delete the `variant === "gradient"` special-case branch (renders like default now — conic gone). Delete `transition-all duration-200` hover translate (`hover:-translate-y-0.5` gone).

- [ ] **Step 2.3: `badge.tsx`**

`rounded-[6px] border-0 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]` as base; tone colors: default `bg-accent-tint text-accent-bright` (dark) — because Tailwind classes are static, use `text-accent` which is lime: prefer **`bg-accent-tint text-accent`** for default, `bg-danger-tint text-danger` danger, `bg-warning-tint text-warning` warning, `bg-bg-elevated text-text-secondary` neutral. Delete pastel/rainbow variants; map any unknown tone → neutral.

- [ ] **Step 2.4: `input.tsx`, `textarea.tsx`, `select.tsx`**

Shared field look: `bg-paper-dim border border-hairline-strong rounded-[8px] text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40`. Height keep current (h-9/h-10). Remove old ring-accent-primary.

- [ ] **Step 2.5: `checkbox.tsx`, `switch.tsx`**

Checked/on state: `bg-accent border-accent` with `text-on-accent` checkmark. Unchecked: `border-hairline-strong bg-paper-dim`. Focus ring `ring-accent/50`.

- [ ] **Step 2.6: `dialog.tsx`, `confirm-dialog.tsx`, `sheet.tsx`**

Overlay scrim: `bg-black/55` (no backdrop-blur — only QuietBar may blur). Panel: `bg-paper-dim border border-hairline-strong rounded-[12px] shadow-[var(--shadow-md)]`. Title: default h styles now Poppins 700. Confirm primary button uses existing Button primary (already lime). Sheet side panel: same panel styles; vaul drag handle `bg-hairline-strong`.

- [ ] **Step 2.7: `tabs.tsx`**

Tab list: `border-b border-hairline`. Trigger: `text-text-secondary data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-3 py-2 text-sm font-semibold`. Content: `pt-4`.

- [ ] **Step 2.8: `toast.tsx`**

Container: `bottom-6 left-1/2 -translate-x-1/2` (was top/right — verify current and move to bottom-center). Toast item: `bg-paper-dim border border-hairline-strong rounded-[8px] shadow-[var(--shadow-md)] text-ink`. Success icon/color `text-accent`, error `text-danger`. Cap visible stack at 3 (slice render list). Timestamps in `font-mono text-[11px] text-ink-faint`.

- [ ] **Step 2.9: `skeleton.tsx`**

Single class: `bg-paper-dim rounded-[8px]` (alias `bg-bg-elevated rounded-[8px]`). Remove `animate-pulse`/shimmer classes if present — static block.

- [ ] **Step 2.10: `spinner.tsx`**

`text-accent` + `animate-spin` (animate-spin stays — loader behavior, not banned).

- [ ] **Step 2.11: `progress.tsx`**

Track `bg-paper-dim rounded-[6px]`, bar `bg-accent rounded-[6px]`.

- [ ] **Step 2.12: `avatar.tsx`**

`rounded-[8px]` (was full), bg `bg-paper-dim`, ring `ring-1 ring-hairline-strong`, initials `font-semibold text-ink`.

- [ ] **Step 2.13: `alert.tsx`**

`rounded-[8px] border border-hairline bg-paper-raised` + left accent bar via existing structure: success `border-l-4 border-l-accent`, warning `border-l-warning`, danger `border-l-danger`, info `border-l-graphite`.

- [ ] **Step 2.14: `divider.tsx`**

`border-hairline` (1px). No double-rule variant needed.

- [ ] **Step 2.15: `empty-state.tsx` + `states.tsx`**

Container: centered, `text-ink`, title inherits h styles; CTA slot passes through Button (lime). `LoadingSkeleton` in states → render 3 stacked `Skeleton` bars (static). `EmptyState` icon area: `text-ink-faint`.

- [ ] **Step 2.16: `tooltip.tsx`**

Panel: `bg-paper-dim text-ink border border-hairline-strong rounded-[6px] shadow-[var(--shadow-sm)] text-caption`. No arrow color tricks.

- [ ] **Step 2.17: `theme-toggle.tsx`**

Restyle chrome only: `rounded-[6px] border border-hairline-strong text-ink-soft hover:text-accent hover:border-accent`. Behavior unchanged (delegates to theme helpers — if it duplicates ThemeSeal logic, leave logic alone).

- [ ] **Step 2.18: Sweep `ui/` for banned leftovers**

Run:
```
Get-ChildItem src/components/ui -Filter *.tsx | Select-String -Pattern 'backdrop-blur|hover-lift|gradient|Fraunces|indigo|violet|#6366F1|rounded-full(?!.tab)' 
```
Expected: only benign hits (e.g. spinner `rounded-full` circle is OK for a spinner — document exemption; pill shape in button `shape: pill` uses `rounded-full` — keep, pills are allowed at 9999px for that variant).

- [ ] **Step 2.19: Verify + commit**

```
npx tsc --noEmit
npx eslint src/components/ui
```
Expected: exit 0.
```bash
git add src/components/ui
git commit -m "feat(ui): restyle shared primitives to Night Study (Approach 1)"
```

---

### Task 3: Restyle `src/components/kitab/*` — PARALLEL after Task 1

**Files:** every `.tsx` in `src/components/kitab/` except barrel `index.ts` exports stay identical.

- [ ] **Step 3.1: `folio.tsx` tones → new tokens**

```ts
const toneStyles: Record<FolioTone, string> = {
  plain: "bg-paper-raised border border-hairline shadow-[var(--shadow-sm)]",
  raised: "bg-paper-dim border border-hairline shadow-[var(--shadow-md)]",
  dim: "bg-paper-dim border border-hairline",
  brick: "bg-accent-tint border border-accent/40",
  moss: "bg-moss-tint border border-moss/40",
  ochre: "bg-ochre-tint border border-ochre/40",
};
```

Folio root base: `rounded-[12px]` (was `rounded-folio` — keep `rounded-folio` if radius token now 12px; token is 12 so `rounded-folio` is fine — **keep class, token already changed**). FolioHeader: `border-b border-hairline px-5 py-3`.

- [ ] **Step 3.2: `stamp-button.tsx`**

```ts
primary: "bg-accent text-on-accent tracking-[0.08em] uppercase hover:bg-accent-bright active:scale-[0.98]",
secondary: "bg-transparent border border-hairline-strong text-ink tracking-[0.08em] uppercase hover:border-accent hover:text-accent active:scale-[0.98]",
tertiary: "bg-transparent text-ink underline decoration-hairline-strong underline-offset-4 hover:decoration-accent hover:text-accent",
quiet: "bg-transparent text-ink-soft hover:text-ink hover:bg-accent-tint active:scale-[0.98]",
destructive: "bg-transparent border border-danger text-danger tracking-[0.08em] uppercase hover:bg-danger-tint active:scale-[0.98]",
```

Sizes: keep heights; radii `rounded-[8px]` on all (add to base). Focus: `focus-visible:outline-2 focus-visible:outline-accent-bright focus-visible:outline-offset-2`.

- [ ] **Step 3.3: `tag.tsx`**

Base `rounded-[6px] font-mono text-[10px] font-medium uppercase tracking-[0.06em] px-2 py-0.5`. Tones: default `bg-accent-tint text-accent`, moss `bg-moss-tint text-moss`, ochre `bg-ochre-tint text-ochre`, plum `bg-plum-tint text-plum`, neutral `bg-paper-dim text-ink-soft`.

- [ ] **Step 3.4: `seal.tsx`**

`rounded-[8px] bg-paper-dim border border-hairline-strong text-ink font-mono` (was pill/ink). Keep size props.

- [ ] **Step 3.5: `rule.tsx`**

Hairline color classes → `border-hairline` / `border-ink` for masthead double rule. Keep structure; masthead stays ink-colored (`border-ink` works both themes).

- [ ] **Step 3.6: `wayfinding.tsx`**

TitleBlock title: `font-bold tracking-[-0.02em] text-ink` (Poppins via h1/base). Crumbs: `text-ink-soft hover:text-accent`, separator `text-ink-faint`, current `text-ink`. Lede: `text-ink-soft`.

- [ ] **Step 3.7: `field.tsx` — boxed field**

Root label: `overline text-ink-faint`. Control: `w-full bg-paper-dim border border-hairline-strong rounded-[8px] px-3 h-10 text-ink placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40`. Remove underline-only bottom-border styles.

- [ ] **Step 3.8: `galley.tsx`**

Galley measure column unchanged (`max-w` 68ch). `Wire` toast item: `bg-paper-dim border border-hairline-strong rounded-[8px] shadow-[var(--shadow-md)]` + `font-mono text-[11px] text-ink-faint` timestamp; container `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-none`; slice to 3.

- [ ] **Step 3.9: `register.tsx`**

Rows: `border-b border-hairline hover:bg-accent-tint`; amount: `tnum text-right text-graphite`; caption: `overline text-ink-faint`.

- [ ] **Step 3.10: `reading-room.tsx` / `exam-desk.tsx`**

Surfaces: `bg-paper-raised border border-hairline rounded-[12px] shadow-[var(--shadow-sm)]`. Timer: `tnum text-accent`. Question grid numbers: `tnum text-ink-faint`, active `text-accent`. No other structural change.

- [ ] **Step 3.11: `overlay-folio.tsx`**

Scrim `bg-black/55` (no blur). Panel `bg-paper-dim border border-hairline-strong rounded-[12px] shadow-[var(--shadow-md)]`. Header keeps MastheadRule.

- [ ] **Step 3.12: `pull-out.tsx`**

Panel: `bg-paper-raised border border-hairline shadow-[var(--shadow-md)] rounded-r-[12px]`. Bookmark tab: `bg-accent text-on-accent` (lime tab), keep `slide-in-left` anim.

- [ ] **Step 3.13: `quiet-bar.tsx` — 44px, glass in dark (spec §4.3)**

Root:
```tsx
"sticky top-0 z-40 hidden h-11 items-center gap-5 border-b border-hairline bg-paper px-4 lg:flex dark:bg-[rgba(28,26,23,0.72)] dark:backdrop-blur-[12px] dark:border-b-[rgba(53,49,43,0.6)]"
```
(Tailwind v4 custom variant `dark` exists in globals: `@custom-variant dark (&:is(.dark *))` — but dark is now default *without* class... **Important:** dark-default means `.dark` class may be absent. Invert: default (no `.light`) is dark. Use CSS classes instead of `dark:` variant: add to `kitab-theme.css` a plain CSS pair:

```css
.quietbar-glass {
  background: var(--paper);
  border-bottom: 1px solid var(--hairline);
}
:root:not(.light) .quietbar-glass,
:root.dark .quietbar-glass {
  background: rgba(28, 26, 23, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom-color: rgba(53, 49, 43, 0.6);
}
```
QuietBar root className becomes: `quietbar-glass sticky top-0 z-40 hidden h-11 items-center gap-5 px-4 lg:flex`.

Wordmark: `font-bold text-base text-ink`. Hub links: `px-2 py-1 text-xs font-semibold` active `text-accent-bright` (use `text-accent` — lime; on dark `#9AD42E` passes on translucent bar; keep `text-accent`) inactive `text-ink-soft hover:text-ink`. Index trigger: `rounded-[6px] border border-hairline-strong px-2 py-1 text-caption text-ink-soft hover:border-accent hover:text-accent`.

- [ ] **Step 3.14: `kitab-index.tsx`**

Scrim `bg-black/55` (remove `bg-ink/30` if insufficient — use `bg-black/55`, no blur). Panel: `bg-paper-dim border border-hairline-strong rounded-[12px] shadow-[var(--shadow-md)]` (keep `rounded-folio` — now 12px, OK). Rows: selected/hover `bg-accent-tint text-ink`; add `data-[active]` not required — current hover only is fine. Kind label: `overline text-ink-faint`. Footer keys: `tnum text-ink-faint`. Enter-hint unchanged.

- [ ] **Step 3.15: `kitab-index-bridge.tsx` + `kitab-shell.tsx`**

Visual-only: shell root `bg-paper`; footer `border-t border-hairline` text `text-ink-faint`; PullOut label styling inherits Task 3.12. HUB_LINKS/index entries unchanged. Staff gating unchanged (admin ERP entry already present).

- [ ] **Step 3.16: `margin-companion.tsx`**

State chips: base `font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-[6px]`; idle/neutral `bg-paper-dim text-ink-soft`; active (listening/planning/tool-running/streaming) `bg-accent-tint text-accent`; awaiting-verification `bg-warning-tint text-warning`; error-retry `bg-danger-tint text-danger`; done-with-caveats `bg-paper-dim text-ink`; cancelled `bg-paper-dim text-ink-faint`. Safeguard banner: `border-y border-danger/50 bg-danger-tint text-ink`. SRS buttons in OverlayFolio → `StampButton` variants already restyled via Task 3.2. No state-machine changes.

- [ ] **Step 3.17: Sweep + verify + commit**

```
Get-ChildItem src/components/kitab -Filter *.tsx | Select-String -Pattern 'Fraunces|indigo|violet|#6366F1|hover-lift|gradient-text|rounded-\[2px\]'
npx tsc --noEmit
npx eslint src/components/kitab
```
Expected: no banned hits; both exit 0.
```bash
git add src/components/kitab
git commit -m "feat(kitab): restyle components to Night Study incl. glass QuietBar"
```

---

### Task 4: AppShell gains the QuietBar — PARALLEL after Task 1

**Files:**
- Modify: `src/components/foundation/app-shell.tsx`

- [ ] **Step 4.1: Render QuietBar chrome above legacy content**

AppShell is a server component; QuietBar is client. Compose via existing client bridge: import `KitabIndexClientBridge` and `QuietBar` is rendered inside the bridge — but bridge owns Index state. **Simplest compliant approach:** render `<KitabIndexClientBridge entries={…} links={…} />` at top of both AppShell branches (it renders QuietBar + overlay; on legacy pages Index still works). Entries: hubs + Forum + AI Tutor + staff entries gated by `isStaffSession(session)`.

```tsx
import { KitabIndexClientBridge } from "@/components/kitab/kitab-index-bridge";
import { isStaffSession } from "@/components/admin/admin-guard";
import type { IndexEntry } from "@/components/kitab/kitab-index";
import type { QuietBarLink } from "@/components/kitab/quiet-bar";

const HUB_LINKS: QuietBarLink[] = [
  { href: "/kitab/today", label: "Today", currentMatch: "/kitab/today" },
  { href: "/kitab/library", label: "Library", currentMatch: "/kitab/library" },
  { href: "/kitab/practice", label: "Practice", currentMatch: "/kitab/practice" },
  { href: "/kitab/community", label: "Community", currentMatch: "/kitab/community" },
  { href: "/kitab/records", label: "Records", currentMatch: "/kitab/records" },
];

function legacyIndex(session: SessionPayload | null): IndexEntry[] {
  const staff = session ? isStaffSession(session) : false;
  return [
    ...HUB_LINKS.map((l) => ({ label: l.label, href: l.href, kind: "hub" as const })),
    { label: "Forum", href: "/forum", kind: "page" as const },
    { label: "AI Tutor", href: "/ai-tutor", kind: "page" as const },
    ...(staff
      ? ([
          { label: "Admin console", href: "/admin", kind: "admin" as const },
          { label: "School ERP", href: "/school/erp", kind: "admin" as const },
        ] satisfies IndexEntry[])
      : []),
  ];
}
```

In **both** return branches, first child: `<KitabIndexClientBridge entries={legacyIndex(session)} links={HUB_LINKS} />`. Add `pt` compensation: QuietBar is sticky (not fixed), so no padding change required. Verify skip-link still first tab stop (bridge has no focusable elements until opened except QuietBar buttons — acceptable; skip link remains first in DOM before bridge: render skip link, then bridge, then AuthLayoutWrapper).

- [ ] **Step 4.2: Verify + commit**

```
npx tsc --noEmit
npx eslint src/components/foundation
pnpm build
```
Expected: exit 0. Commit:
```bash
git add src/components/foundation/app-shell.tsx
git commit -m "feat(foundation): AppShell renders Kitab QuietBar + Index"
```

---

### Task 5: Admin → School ERP access + regression spec — PARALLEL (any time)

**Files:**
- Create: `tests/e2e/admin-erp-access.spec.ts`
- Modify: only if verification finds a real blocker (start with **no code changes**)

- [ ] **Step 5.1: Manual verification path**

Start stack if available: `pnpm run docker:up && pnpm run db:migrate && pnpm run db:seed` (from `learningopk/`), then `pnpm run dev:all`. Login as seeded admin (check `backend/scripts` / seed output for credentials; typically documented in `backend/README` or seed file). Open `/school/erp` directly; then repeat via `⌘K` → "School ERP". Navigate People + Classes modules.

If infra unavailable: skip manual run, rely on code-path audit already in spec §5 (backend returns all schools for admin; layout passes when `schools.length > 0`; ErpProvider `isAdmin:true` grants `hasPermission`) + ship the spec for CI.

- [ ] **Step 5.2: Write the failing spec (TDD — spec first)**

```ts
import { test, expect } from "@playwright/test";

test.describe("Admin can access School ERP", () => {
  test("admin reaches /school/erp workspace from login", async ({ page }) => {
    // Seeded platform admin — adjust selector/creds to match existing helpers
    // in tests/e2e/admin-kitab-access.spec.ts (reuse its login helper pattern).
    await page.goto("/login");
    // …login as admin using the same credentials/selector as admin-kitab-access.spec.ts…
    await page.goto("/school/erp");
    await expect(page).toHaveURL(/\/school\/erp/);
    // Workspace chrome renders (not the "No school access" empty state):
    await expect(page.getByText("No school access")).toHaveCount(0);
  });

  test("Index exposes School ERP entry for staff", async ({ page }) => {
    // …login as admin…
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Index" })).toBeVisible();
    await expect(page.getByRole("link", { name: "School ERP" })).toBeVisible();
  });

  test("non-staff user cannot use ERP", async ({ page }) => {
    // …login as seeded student…
    await page.goto("/school/erp");
    // Backend returns [] schools → empty-state message OR redirect; assert actual:
    await expect(
      page.getByText("No school access").or(page.getByURL(/\/login|\/today/))
    ).toBeVisible();
  });
});
```

Implementation note: copy the exact login helper from `tests/e2e/admin-kitab-access.spec.ts` — read that file and inline its helper code into this spec (do not import across specs unless the repo already does).

- [ ] **Step 5.3: Run spec if infra up, else record fallback**

Run: `pnpm run test:e2e tests/e2e/admin-erp-access.spec.ts`
Expected: PASS — or if docker unavailable: note in commit message `e2e deferred: no local stack (route-state matrix fallback)`.

- [ ] **Step 5.4: Fix only if a real failure appears**

If admin sees "No school access": debug `fetchErpSchoolsServer` (`src/lib/erp-api.ts:1143`) — check cookie forwarding + backend URL env. Fix minimal root cause only.

- [ ] **Step 5.5: Commit**

```bash
git add tests/e2e/admin-erp-access.spec.ts
# + any minimal fix
git commit -m "test(e2e): admin School ERP access regression spec"
```

---

### Task 6: Contrast CI script — PARALLEL after Task 1

**Files:**
- Create: `scripts/check-contrast.mjs`
- Modify: `package.json` (add script)

- [ ] **Step 6.1: Write contrast checker**

```js
// scripts/check-contrast.mjs — WCAG contrast gate for Kitab v3. Spec §6.4.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/design-system/kitab-tokens.css"), "utf8");

function extractBlock(selectorRe) {
  const m = css.match(selectorRe);
  if (!m) throw new Error(`block not found: ${selectorRe}`);
  return m[0];
}
function parseVars(block) {
  const out = {};
  for (const [, k, v] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[k.trim()] = v.trim();
  }
  return out;
}

const dark = parseVars(extractBlock(/:root\s*\{[^}]+\}/));
const light = parseVars(extractBlock(/:root\.light[\s\S]*?\.light\s*\{[^}]+\}/));

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const PAIRS = [
  ["--ink", "--paper", 4.5],
  ["--ink-soft", "--paper", 4.5],
  ["--ink", "--paper-raised", 4.5],
  ["--ink-soft", "--paper-raised", 4.5],
  ["--accent", "--paper", 3.0],          // large/UI text
  ["--on-accent", "--accent", 4.5],      // button labels
  ["--danger", "--paper", 4.5],
  ["--warning", "--paper", 3.0],
  ["--graphite", "--paper", 4.5],
  ["--accent-bright", "--paper", 4.5],   // light-theme link green
];

let failed = 0;
for (const [themeName, vars] of [["dark", dark], ["light", light]]) {
  for (const [fg, bg, min] of PAIRS) {
    const a = hexToRgb(vars[fg] ?? "");
    const b = hexToRgb(vars[bg] ?? "");
    if (!a || !b) {
      console.error(`FAIL ${themeName}: cannot parse ${fg} (${vars[fg]}) / ${bg} (${vars[bg]})`);
      failed++;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${themeName} ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min})`);
  }
}
if (failed) {
  console.error(`\n${failed} contrast failure(s)`);
  process.exit(1);
}
console.log("\nAll contrast pairs pass");
```

- [ ] **Step 6.2: Wire package.json**

Add to `scripts`: `"check:contrast": "node scripts/check-contrast.mjs"`.

- [ ] **Step 6.3: Run — fix token hex until green**

Run: `pnpm run check:contrast`
Expected: exit 0, all PASS. If a FAIL: adjust the failing hex in `kitab-tokens.css` (keep hue family), re-run. (Known risk: `--accent-bright` in **dark** block is `#B7F04A` — the PAIRS entry `--accent-bright on --paper` is intended for light theme's `#4A6B0A`; if dark fails because `--accent-bright` dark isn't a text color, remove `--accent-bright` from shared PAIRS and add a light-only list — handle inside script, keep it green without weakening real pairs.)

- [ ] **Step 6.4: Commit**

```bash
git add scripts/check-contrast.mjs package.json src/design-system/kitab-tokens.css
git commit -m "ci: contrast check script for Night Study token pairs"
```

---

### Task 7: Final gates — AFTER all parallel tasks

- [ ] **Step 7.1: Full gate run**

```
npx tsc --noEmit
npx eslint src/components/kitab src/components/ui src/components/foundation app
pnpm build
pnpm run check:contrast
```
Expected: all exit 0; build compiles + static pages generated.

- [ ] **Step 7.2: Banned-pattern sweep (spec §6.5)**

```powershell
Get-ChildItem -Recurse -Include *.tsx,*.ts,*.css -Path src,app |
  Select-String -Pattern 'indigo|violet|#6366F1|hover-lift|gradient-text|Fraunces|--font-fraunces'
Get-ChildItem -Recurse -Include *.tsx,*.ts -Path src,app |
  Select-String -Pattern 'backdrop-blur|backdrop-filter'
```
Expected: first command → 0 hits. Second → only `quiet-bar.tsx` / `kitab-theme.css` `.quietbar-glass` rule.

- [ ] **Step 7.3: E2E (best effort)**

`pnpm run test:e2e` if stack up; else document fallback per spec §6.

- [ ] **Step 7.4: Final commit (if any gate fixes were needed)**

```bash
git add -A
git commit -m "chore(kitab): v3 gate fixes — tsc/lint/build/contrast green"
```

---

## Self-review (plan author)

1. **Spec coverage:** §3 tokens/fonts/theme → T1; §4.1 ui/* → T2; §4.2 kitab/* → T3; §4.3 chrome/QuietBar glass → T3.13 + T4; §5 ERP → T5; §6 gates → T6 + T7; §7 order → T1→{2|3|4|5|6}→T7. Out-of-scope items untouched. ✓
2. **Placeholders:** T5 login helper defers to *reading an existing spec file* and inlining — allowed (points to real code, not "TBD"). No TODO/other placeholders. ✓
3. **Type consistency:** `KitabIndexClientBridge` props (`entries`, `links`) match T3.15 usage; `IndexEntry.kind` union includes `"admin"` (from kitab-index.tsx); `AppTheme` unchanged; `--font-poppins` name matches layout ↔ theme bridge. ✓

## Execution handoff

Plan complete and saved here. Two options:

**1. Subagent-Driven (you asked for this — recommended):** dispatch fresh parallel subagents per task (T2‖T3‖T4‖T5‖T6 after T1), review between tasks via superpowers:subagent-driven-development.

**2. Inline Execution:** execute in-session via superpowers:executing-plans with checkpoints.
