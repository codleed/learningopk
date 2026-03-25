# LearningoPK Design System

## Overview

LearningoPK uses a unified design system built on Tailwind CSS with CVA (Class Variance Authority) for component styling. This document outlines the design tokens, components, and usage guidelines.

---

## Design Tokens

### Color System

#### Light Theme
```css
--primary: #7ac943;
--primary-hover: #68b036;
--primary-foreground: #ffffff;
--primary-light: rgba(122, 201, 67, 0.2);

--background: #f8fafc;
--foreground: #0f172a;
--card: #ffffff;
--card-foreground: #0f172a;
--popover: #ffffff;
--popover-foreground: #0f172a;

--secondary: #f1f5f9;
--secondary-foreground: #0f172a;
--muted: #e2e8f0;
--muted-foreground: #64748b;
--accent: #f1f5f9;
--accent-foreground: #0f172a;

--destructive: #ef4444;
--destructive-foreground: #ffffff;
--success: #10b981;
--success-foreground: #ffffff;
--warning: #f59e0b;
--warning-foreground: #ffffff;

--border: #e2e8f0;
--input: #cbd5e1;
--ring: #7ac943;
```

#### Dark Theme
```css
--primary-hover: #8fd654;
--background: #0f172a;
--foreground: #f8fafc;
--card: #1e293b;
--secondary: #1e293b;
--muted: #334155;
--muted-foreground: #94a3b8;
--accent: #1e293b;
--border: #334155;
--input: #475569;
```

### Pastel Accent Colors

```css
--pastel-dustyRose: rgba(212, 165, 165, 0.3);
--pastel-sage: rgba(165, 196, 165, 0.3);
--pastel-slateBlue: rgba(165, 180, 196, 0.3);
--pastel-warmSand: rgba(212, 196, 165, 0.3);
--pastel-lavender: rgba(196, 165, 212, 0.3);
--pastel-peach: rgba(212, 184, 165, 0.3);
```

### Typography

```css
--font-heading: 'DM Serif Display', Georgia, serif;
--font-body: 'Source Serif 4', Georgia, serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
--text-5xl: 3rem;
```

### Spacing (4px Base Grid)

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

### Animation

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

---

## Components

### Button

**Location:** `src/components/ui/button.tsx`

**Variants:**
- `primary` - Main actions (Submit, Start, Send)
- `secondary` - Alternative actions (Cancel, Back)
- `ghost` - Tertiary actions (Settings, Filter)
- `danger` - Destructive actions (Delete, Remove)

**Sizes:**
- `sm` - Compact buttons (h-8, px-3)
- `md` - Default buttons (h-10, px-4)
- `lg` - Large buttons (h-12, px-6)

**States:**
- Default
- Hover (bg-darkens, shadow appears for primary)
- Focus (ring-2 ring-[var(--primary)])
- Active (scale 0.98)
- Disabled (opacity-50, cursor-not-allowed)
- Loading (shows spinner, "Loading..." text)

**Usage:**
```tsx
import { Button } from "@/components/ui";

<Button variant="primary" size="md">Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" loading>Delete</Button>
```

---

### Badge

**Location:** `src/components/ui/badge.tsx`

**Variants:**
- Semantic: `neutral`, `info`, `success`, `warning`, `error`
- Pastel: `dustyRose`, `sage`, `slateBlue`, `warmSand`, `lavender`, `peach`

**Usage:**
```tsx
import { Badge } from "@/components/ui";

<Badge variant="success">Active</Badge>
<Badge variant="sage">Sage Badge</Badge>
```

---

### Card

**Location:** `src/components/ui/card.tsx`

**Variants:**
- `default` - Standard card with border and shadow
- `elevated` - Stronger shadow, hover effect
- `outlined` - Double border, no background
- `ghost` - No border, no shadow, transparent

**Sub-components:**
- `CardHeader` - Header section with border-bottom
- `CardTitle` - Title text (heading font)
- `CardDescription` - Supporting description
- `CardContent` - Main content area
- `CardFooter` - Footer with top border
- `CardActions` - Action buttons container

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button size="sm">Action</Button>
  </CardFooter>
</Card>
```

---

### Input

**Location:** `src/components/ui/input.tsx`

**States:**
- Default
- Focus (border-primary, ring)
- Error (border-destructive)
- Disabled (opacity-50)

**Usage:**
```tsx
import { Input } from "@/components/ui";

<Input placeholder="Enter text..." />
<Input error placeholder="Invalid input..." />
<Input disabled placeholder="Disabled..." />
```

---

### Textarea

**Location:** `src/components/ui/textarea.tsx`

**Props:**
Same as Input plus `resize` behavior.

**Usage:**
```tsx
import { Textarea } from "@/components/ui";

<Textarea placeholder="Multi-line text..." />
<Textarea error placeholder="Invalid..." />
```

---

### Skeleton

**Location:** `src/components/ui/skeleton.tsx`

**Variants:**
- `default` - Generic skeleton block
- `circular` - Circle shape (for avatars)
- `text` - Text line
- `title` - Title placeholder
- `avatar` - Avatar placeholder
- `button` - Button placeholder
- `card` - Card shape
- `paragraph` - Paragraph with multiple lines
- `badge` - Badge placeholder

**Pre-built Skeletons:**
- `SkeletonCard` - Card-shaped skeleton
- `SkeletonTable` - Table with rows
- `SkeletonList` - List with items

**Usage:**
```tsx
import { Skeleton, SkeletonCard } from "@/components/ui";

<Skeleton variant="text" />
<SkeletonCard />
```

---

## Guidelines

### Component Architecture

1. **Use CVA + Tailwind** for all new components
2. **Avoid inline styles** except for dynamic values
3. **Avoid Framer Motion** on base components (use CSS transitions)
4. **Export from `ui/` index** for all reusable components

### File Structure

```
src/components/ui/
├── button.tsx
├── badge.tsx
├── card.tsx
├── input.tsx
├── textarea.tsx
├── checkbox.tsx
├── select.tsx
├── skeleton.tsx
├── toast.tsx
├── theme-toggle.tsx
├── index.ts           # Barrel export
```

### Accessibility

- All interactive elements have focus states
- Buttons have `disabled` states with proper cursor
- Form inputs have associated labels
- Color contrast meets WCAG AA standards
- Skeleton loaders have `aria-busy` attribute

---

## Migration Notes

### From design-system to ui/

The `design-system/components/` folder is deprecated. Update imports:

**Old:**
```tsx
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
```

**New:**
```tsx
import { Button, Badge } from "@/components/ui";
```

---

## Performance Considerations

- Components use tree-shakeable CVA
- Heavy components (ForceGraph) use dynamic imports
- Skeleton loaders prevent layout shift
- CSS transitions over JavaScript animations

---

## Future Enhancements

- [ ] Add React Query for data fetching
- [ ] Create form component library
- [ ] Add tooltip component
- [ ] Create modal/dialog component
- [ ] Add dropdown menu component
