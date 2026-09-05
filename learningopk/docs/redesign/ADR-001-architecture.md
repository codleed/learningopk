# ADR-001: Consolidate Competing Component Systems

## Status

**Proposed** | Accepted | Deprecated | Superseded by ADR-XXX

## Context

### The Problem

LearningoPK frontend has **two competing component systems** that implement the same UI elements:

| Component   | `src/components/ui/`   | `src/design-system/components/` |
| ----------- | ---------------------- | ------------------------------- |
| Button      | CVA + Tailwind classes | Framer Motion + inline CSS      |
| Badge       | CVA + Tailwind         | Framer Motion + inline CSS      |
| Input       | Tailwind classes       | Inline CSS with size variants   |
| ThemeToggle | Tailwind classes       | Framer Motion + inline CSS      |
| Card        | N/A                    | Framer Motion + inline CSS      |
| Typography  | N/A                    | Inline CSS                      |

### Analysis

**`src/components/ui/` Pattern:**

```tsx
// Uses class-variance-authority (CVA) + Tailwind
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold...",
  { variants: { variant: {...}, size: {...} } }
);
export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

- Bundle size: ~2kb (CVA is lightweight)
- Tree-shakeable
- Standard Tailwind classes
- No runtime animation library

**`src/design-system/components/` Pattern:**

```tsx
// Uses Framer Motion + inline CSS properties
const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "0.375rem 0.75rem", fontSize: "0.75rem", minHeight: "2rem" },
  // ...
};
const variantStyles: Record<ButtonVariant, React.CSSProperties> = {...};

export function Button({ children, variant = "primary", size = "md", style, ...props }) {
  const baseStyle = { fontFamily: "var(--font-body)", display: "inline-flex", ...sizeStyles[size], ...variantStyles[variant], ...style };
  return (
    <motion.button style={baseStyle} whileTap={{ scale: 0.98 }} {...props}>
      {children}
    </motion.button>
  );
}
```

- Bundle size: ~50kb (Framer Motion)
- Not tree-shakeable for unused variants
- Inline styles harder to override
- Rich animation capabilities

### Architectural Issues Identified

1. **Bundle Bloat**: Framer Motion (~50kb) loaded even when only using simple buttons
2. **Maintenance Duplication**: Two Button components, two Badge components, two Input components
3. **Inconsistent Behavior**: Animation on some buttons, not others
4. **Developer Confusion**: Which component to use? When?
5. **Styling Inconsistency**: Some components use CSS classes, others use inline styles
6. **Theme Coupling**: Design-system components hardcode CSS variable references in inline styles

## Decision

### Resolution: Consolidate on CVA + Tailwind Pattern

**Adopt `src/components/ui/` as the single source of truth** with these enhancements:

1. **Keep CVA + Tailwind** as the primary styling approach
2. **Add Framer Motion animations** only where motion is essential (chat messages, page transitions)
3. **Extract shared types** to `src/lib/types/components.ts`
4. **Migrate design-system components** to ui/ or deprecate

### Migration Plan

#### Phase 1: Deprecate design-system Button, Badge, Input

- Update imports to point to `ui/` components
- Add any missing variants (e.g., `ui/badge` needs pastel variants)
- Document breaking changes

#### Phase 2: Extract reusable primitives

- Move shared types to `src/lib/types/`
- Ensure theme tokens are accessible via Tailwind classes

#### Phase 3: Animation layer (optional)

- Add `motion` wrapper components for specific animation needs
- Use Framer Motion only for orchestrated animations, not base components

### Component Decision Matrix

| Component   | Target Location                      | Rationale                       |
| ----------- | ------------------------------------ | ------------------------------- |
| Button      | `src/components/ui/button.tsx`       | Standardize on CVA              |
| Badge       | `src/components/ui/badge.tsx`        | Add pastel variants to existing |
| Input       | `src/components/ui/input.tsx`        | Standardize on CVA              |
| Card        | `src/components/ui/card.tsx`         | Create new Card using CVA       |
| Typography  | `src/components/ui/typography.tsx`   | Extract from design-system      |
| ThemeToggle | `src/components/ui/theme-toggle.tsx` | Migrate existing                |

## Consequences

### Easier

- Single component to maintain per UI element
- Consistent styling approach across codebase
- Easier onboarding for new developers
- Smaller bundle size (remove Framer Motion from base components)

### Harder

- Migrating existing usages of design-system components
- May need to recreate some animation effects with CSS
- Pastel accent gradients need reimplementation

### New Considerations

- Animation strategy must be defined (CSS transitions vs Framer Motion for complex sequences)
- Card component needs new implementation
- Typography component needs extraction

## Implementation Notes

### New Folder Structure

```
src/
├── components/
│   ├── ui/                    # shadcn-style primitives (CVA + Tailwind)
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx           # NEW - CVA-based Card
│   │   ├── typography.tsx     # NEW - extracted Typography
│   │   └── ...
│   ├── design-system/          # DEPRECATED - migrate away
│   │   └── (to be removed after migration)
│   ├── feature-name/           # Feature-specific components
│   └── foundation/             # App-level foundations
├── lib/
│   ├── types/
│   │   └── components.ts       # Shared component types
│   └── utils.ts
└── app/
```

### Code Quality Rules Going Forward

1. **Styling**: Use CVA + Tailwind for all base components
2. **Animation**: Use Framer Motion only in dedicated motion components
3. **Prop Drilling**: Max 2 levels, prefer composition or context
4. **Component Size**: Max 150 lines per component file
5. **Imports**: Group by external → internal → relative

---

**Date**: 2026-03-25
**Author**: Architecture Review
**Status**: Proposed for Implementation in Phase 6
