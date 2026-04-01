# Design System

The design system provides the foundational visual layer for LearningoPK's frontend.

## Structure

```
design-system/
├── tokens.css        # All CSS custom properties (colors, spacing, radii, shadows, fonts)
├── components/       # Legacy components (inline styles + framer-motion) — being phased out
├── hooks/            # Legacy theme hooks — replaced by next-themes
└── theme/            # Legacy theme utilities — replaced by CSS variables
```

## Tokens (`tokens.css`)

All design tokens are defined as CSS custom properties in `tokens.css` and consumed via Tailwind classes or `var()` references. Tokens are organized into:

- **Colors**: Semantic color scales for both light and dark themes (accent, text, bg, border, status)
- **Spacing**: 4px grid system (`--space-1` = 4px through `--space-16` = 64px)
- **Radii**: Border radius scale (`--radius-sm` through `--radius-full`)
- **Shadows**: Elevation system (`--shadow-sm` through `--shadow-2xl`)
- **Typography**: Font family variables (`--font-display`, `--font-body`, `--font-mono`)
- **Layout**: Sidebar dimensions, header height, content max-width

## Theming

Themes are managed by `next-themes` with `attribute="class"`. The `:root` selector defines light theme tokens, and `.dark` overrides them for dark mode. No JavaScript theme detection is needed — CSS variables handle everything.

## Usage

```tsx
// In components, use Tailwind classes that map to CSS variables:
<div className="bg-bg-surface text-text-primary border-border-default" />

// Or use var() directly for one-off cases:
<div style={{ color: "var(--accent-primary)" }} />
```

## Important

- **DO NOT** use `@/design-system/components` for new work — use `@/components/ui` instead
- **DO NOT** hardcode hex colors in components — always use CSS variables
- **DO NOT** use `Inter`, `Roboto`, or `system-ui` — the design system uses Syne (display), DM Sans (body), JetBrains Mono (code)
