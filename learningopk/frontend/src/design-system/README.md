# Design System — "Study Field Notes"

The visual foundation for LearningoPK: a calm exam-notebook workspace for Pakistani
Grade 9–10 board-exam students. Paper canvas, ink text, leaf-green study/action
signals, sky-blue explanation/reference surfaces. Full direction:
`../../../docs/plans/ui-redesign-plan.md`.

## Structure

```
design-system/
├── tokens.css   # All design tokens (single source of truth)
└── README.md    # This file — usage rules and anti-patterns
```

Theme bridging for shadcn/Tailwind semantic names lives in `app/theme.css`;
Tailwind v4 utility mapping lives in the `@theme inline` block of `app/globals.css`.

## Named roles

Use roles to decide *which* token to reach for, then use the semantic token:

| Role | Token | Use for |
|---|---|---|
| Paper | `--bg-base` | default app canvas |
| Ink | `--text-primary` | primary text, headings |
| Leaf | `--accent-primary` | primary action, active nav, completed state, study progress |
| Mint wash | `--accent-primary-light` | selected/positive surfaces, progress backgrounds |
| Sky | `--accent-info` | information, explanation, references, AI tutor context |
| Blue wash | `--accent-info-light` | study guidance, formulas, hints, non-destructive callouts |
| Line | `--border-default` | quiet borders, notebook rules |
| Warm amber | `--accent-warning` | deadlines and attention **only** — never decoration |

Status roles (`--accent-success/-warning/-danger/-info` + `-light` washes) cover
feedback. Do not introduce new hues.

## Rules

- **No hardcoded colors.** Always `var()` tokens or their Tailwind mappings
  (`bg-bg-surface`, `text-text-primary`, `border-border-default`,
  `bg-accent-primary`, `bg-accent-info-light`, …). One-off inline values must
  still be `var()` references.
- **Use `@/components/ui` primitives** (CVA-based) for new work. Do not create
  parallel component paths.
- **Fonts:** Fraunces (`font-display`) for page titles and major learning
  statements only; Geist (`font-body`, default) for navigation, controls,
  tables, dense study UI; JetBrains Mono (`font-mono`) for formulas, timers,
  and numeric study data. No marketing-sized headings inside the app —
  sanctioned scale: `text-sm` → `text-base` → `text-lg` → `text-xl` →
  `text-2xl` (display, page titles only).
- **Radii:** medium and consistent (`--radius-sm/md/lg/xl`, max 16px). Pills
  (`--radius-full`) only for badges and small status chips.
- **Surfaces:** cards are for bounded tasks (continue studying, quiz card,
  assignment due). Running content sits directly on the canvas with section
  hierarchy and hairline rules — do not wrap every paragraph in a card.
- **Motion:** one orchestrated entrance per major page, then restrained
  transitions (`--transition-fast/normal`). Motion explains state (path
  progression, answer confirmation, drawer open/close). Everything must
  respect `prefers-reduced-motion` (see the block in `app/globals.css`).
- **Icons:** Lucide only, always paired with a visible label or an
  accessible name. No icon-only ambiguity, no decorative icon noise.
- **Dark mode** is the deliberate "night study" derivation in `tokens.css`
  (`.dark` block). Never just invert; if a new surface is added, define both
  variants there.

## Anti-patterns (AI-slop signals — reject in review)

- Rainbow gradients, glassmorphism, decorative blobs, stock illustrations.
- Pill-shaped everything; identical rounded cards for unrelated content.
- Giant meaningless hero statistics; percentages with no next action.
- Perpetual decorative animation, confetti by default, parallax.
- Vague marketing copy inside the app; unlabelled icon controls.
- Color-only meaning (always pair with label/icon).
- New one-off hex values, arbitrary z-index, or ad-hoc shadows.

## Theming mechanics

`next-themes` with `attribute="class"`, light default, system disabled.
`:root` light tokens in `tokens.css`; `.dark` overrides in the same file.
No JS theme detection needed — CSS variables handle everything.
