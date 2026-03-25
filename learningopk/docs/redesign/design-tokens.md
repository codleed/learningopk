# LearningoPK Design Token System & Component Specs

## Date
2026-03-25

## Designer
UI Design System Review

---

## Design Foundations

### Brand Identity
- **Primary**: Green (#7ac943) - Learning, growth, progress
- **Typography**: Serif fonts for warmth (DM Serif Display headings, Source Serif 4 body)
- **Target Audience**: Pakistani 9th-10th grade students (14-16 years)
- **Tone**: Friendly, encouraging, accessible, educational

### Design Principles
1. **Clarity First** - Educational content must be easy to read
2. **Consistent Rhythm** - 4px base grid, 8pt spacing system
3. **Gentle Animations** - Subtle, not distracting from learning
4. **Accessibility** - WCAG AA compliant contrast ratios

---

## Color System

### Primary Colors (Light Theme)
```css
--primary: #7ac943;           /* Main brand green */
--primary-hover: #68b036;     /* Darker on hover */
--primary-foreground: #ffffff; /* Text on primary */
--primary-light: rgba(122, 201, 67, 0.2); /* Light green tint */
```

### Semantic Colors
```css
--success: #10b981;           /* Emerald green */
--success-foreground: #ffffff;
--warning: #f59e0b;          /* Amber */
--warning-foreground: #ffffff;
--destructive: #ef4444;       /* Red */
--destructive-foreground: #ffffff;
```

### Neutral Colors (Light Theme)
```css
--background: #f8fafc;        /* Page background */
--foreground: #0f172a;        /* Primary text */
--card: #ffffff;              /* Card background */
--card-foreground: #0f172a;
--popover: #ffffff;
--popover-foreground: #0f172a;
--secondary: #f1f5f9;         /* Secondary surfaces */
--secondary-foreground: #0f172a;
--muted: #e2e8f0;            /* Muted backgrounds */
--muted-foreground: #64748b;  /* Muted text */
--accent: #f1f5f9;            /* Accent surfaces */
--accent-foreground: #0f172a;
--border: #e2e8f0;            /* Borders */
--input: #cbd5e1;             /* Input borders */
--ring: #7ac943;             /* Focus rings */
```

### Dark Theme Colors
```css
--background: #0f172a;
--foreground: #f8fafc;
--card: #1e293b;
--card-foreground: #f8fafc;
--popover: #1e293b;
--popover-foreground: #f8fafc;
--secondary: #1e293b;
--secondary-foreground: #f8fafc;
--muted: #334155;
--muted-foreground: #94a3b8;
--accent: #1e293b;
--accent-foreground: #f8fafc;
--border: #334155;
--input: #475569;
--primary-hover: #8fd654;    /* Lighter on dark hover */
```

### Pastel Accents (for Cards/Badges)
```css
--pastel-dusty-rose: rgba(212, 165, 165, 0.15);
--pastel-sage: rgba(165, 196, 165, 0.15);
--pastel-slate-blue: rgba(165, 180, 196, 0.15);
--pastel-warm-sand: rgba(212, 196, 165, 0.15);
--pastel-lavender: rgba(196, 165, 212, 0.15);
--pastel-peach: rgba(212, 184, 165, 0.15);
```

---

## Typography System

### Font Families
```css
--font-heading: 'DM Serif Display', Georgia, serif;
--font-body: 'Source Serif 4', Georgia, serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Type Scale
```css
--text-xs: 0.75rem;      /* 12px - captions */
--text-sm: 0.875rem;     /* 14px - secondary text */
--text-base: 1rem;       /* 16px - body text */
--text-lg: 1.125rem;     /* 18px - emphasized body */
--text-xl: 1.25rem;      /* 20px - section headers */
--text-2xl: 1.5rem;     /* 24px - card titles */
--text-3xl: 1.875rem;   /* 30px - page headers */
--text-4xl: 2.25rem;    /* 36px - hero text */
--text-5xl: 3rem;        /* 48px - landing heroes */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;   /* Headlines */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Long-form reading */
```

---

## Spacing System (4px Base Grid)

```css
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
--space-24: 6rem;       /* 96px */
```

---

## Component Specifications

### Button Component

**Variants**: `primary` | `secondary` | `ghost` | `danger`

**Sizes**: `sm` | `md` | `lg`

**States**: `default` | `hover` | `focus` | `active` | `disabled` | `loading`

#### Primary Button
```
Default: bg-[var(--primary)], text-[var(--primary-foreground)], border-2 border-[var(--primary)]
Hover: bg-[var(--primary-hover)], shadow-md
Active: scale(0.98)
Disabled: opacity-0.5, cursor-not-allowed
Loading: opacity-0.7, cursor-wait
```

#### Secondary Button
```
Default: bg-[var(--card)], text-[var(--foreground)], border-2 border-[var(--border)]
Hover: border-[var(--primary)]/40, bg-[var(--accent)]/50
Active: scale(0.98)
Disabled: opacity-0.5
```

#### Ghost Button
```
Default: bg-transparent, text-[var(--foreground)], border-2 border-transparent
Hover: bg-[var(--accent)]/55
Disabled: opacity-0.5
```

#### Danger Button
```
Default: bg-[var(--destructive)], text-[var(--destructive-foreground)]
Hover: bg-[var(--destructive)]/90
Disabled: opacity-0.5
```

#### Size Specifications
| Size | Padding | Font Size | Min Height | Border Radius |
|------|---------|-----------|------------|---------------|
| sm | 0.375rem 0.75rem | 0.75rem | 2rem | 0.375rem |
| md | 0.5rem 1rem | 0.875rem | 2.5rem | 0.5rem |
| lg | 0.75rem 1.5rem | 1rem | 3rem | 0.5rem |

#### Focus State
```
focus: outline-none ring-2 ring-[var(--primary)] ring-offset-2
```

---

### Input Component

**Sizes**: `sm` | `md` | `lg`

**States**: `default` | `focus` | `error` | `disabled`

```
Default: bg-[var(--card)], border-2 border-[var(--input)], text-[var(--foreground)]
Focus: border-[var(--primary)], ring-2 ring-[var(--primary)]/20
Error: border-[var(--destructive)]
Disabled: opacity-0.5, cursor-not-allowed
```

| Size | Padding | Font Size | Min Height |
|------|---------|-----------|------------|
| sm | 0.375rem 0.625rem | 0.75rem | 2rem |
| md | 0.625rem 1rem | 1rem | 3rem |
| lg | 0.75rem 1.25rem | 1.125rem | 3.5rem |

---

### Badge Component

**Variants**: `neutral` | `info` | `success` | `warning` | `error` | `dustyRose` | `sage` | `slateBlue` | `warmSand` | `lavender` | `peach`

```
Size: font-size 0.75rem, padding 0.25rem 0.5rem
Border Radius: 12px (pill shape)
Letter Spacing: 0.05em
Text Transform: uppercase
```

| Variant | Background | Text Color |
|---------|-----------|------------|
| neutral | var(--muted) | var(--muted-foreground) |
| info | blue-500/20 | blue |
| success | var(--success)/20 | var(--success) |
| warning | var(--warning)/20 | var(--warning) |
| error | var(--destructive)/20 | var(--destructive) |
| dustyRose | rgba(212,165,165,0.3) | #8b5a5a |
| sage | rgba(165,196,165,0.3) | #5a8b5a |
| slateBlue | rgba(165,180,196,0.3) | #5a6b8b |
| warmSand | rgba(212,196,165,0.3) | #8b7a5a |
| lavender | rgba(196,165,212,0.3) | #7a5a8b |
| peach | rgba(212,184,165,0.3) | #8b6a5a |

---

### Card Component

```
Background: var(--card)
Border: 1px solid var(--border)
Border Radius: 8px
Shadow: var(--shadow-sm)
Padding: var(--space-4) (default), 0 (noPadding option)
```

#### Card Header
```
Padding Bottom: var(--space-3)
Border Bottom: 1px solid var(--border)
Margin Bottom: var(--space-3)
```

#### Card Title
```
Font Family: var(--font-heading)
Font Size: 1.25rem
Font Weight: 600
Color: var(--card-foreground)
Margin: 0
```

#### Card Footer
```
Padding Top: var(--space-3)
Border Top: 1px solid var(--border)
Margin Top: var(--space-3)
```

---

### Animation Tokens

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

#### Animation Types
| Animation | Duration | Easing | Use Case |
|-----------|----------|--------|----------|
| Fade In | 200ms | ease-out | Content appearance |
| Slide Up | 300ms | ease-out | Modal/overlay entry |
| Scale | 100ms | ease-out | Button press |
| Streaming Dots | 1200ms | ease-in-out | AI typing indicator |

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

---

## Border Radius

```css
--radius-sm: calc(var(--radius) - 4px);  /* 4px */
--radius-md: calc(var(--radius) - 2px);  /* 6px */
--radius-lg: var(--radius);               /* 8px */
--radius-xl: calc(var(--radius) + 4px);   /* 12px */
--radius-2xl: calc(var(--radius) + 8px);  /* 16px */
--radius-3xl: calc(var(--radius) + 12px); /* 20px */
--radius-full: 9999px;                    /* Pill shape */
```

---

## Z-Index Scale

```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
--z-toast: 1080;
```

---

## Responsive Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Container Widths
| Breakpoint | Max Width | Padding |
|------------|-----------|---------|
| Mobile | 100% | 16px |
| sm | 640px | 16px |
| md | 768px | 24px |
| lg | 1024px | 32px |
| xl | 1280px | 48px |

---

## Accessibility Requirements

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

### Focus Indicators
- Visible focus ring on all interactive elements
- Ring: 2px solid var(--ring), offset 2px

### Touch Targets
- Minimum 44x44px for mobile
- 8px minimum spacing between targets

### Motion
- Respect `prefers-reduced-motion`
- Provide alternative for animated content

---

## Component Usage Guidelines

### Button Usage
- **Primary**: Main actions (Submit, Start Quiz, Send)
- **Secondary**: Alternative actions (Cancel, Back)
- **Ghost**: Tertiary actions (Settings, Filter)
- **Danger**: Destructive actions (Delete, Remove)

### Badge Usage
- **Status**: Online/offline, solved/unsolved
- **Categories**: Subject tags, chapter markers
- **Counts**: Notification counts, message counts

### Card Usage
- Use for grouping related content
- Consistent padding within cards
- Clear visual hierarchy (title → content → actions)

---

## Status: Design Tokens Finalized

Ready for implementation. All tokens use CSS custom properties for runtime theming support.