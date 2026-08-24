# Changelog

All notable changes to the LearningoPK project will be documented in this file.

## [Unreleased] - 2026-03-25

### Added

- **Architecture Decision Record** (`docs/redesign/ADR-001-architecture.md`)
  - Documented the decision to consolidate on CVA + Tailwind pattern
  - Defined migration path from design-system components to ui/ components

- **New UI Components** (`src/components/ui/`)
  - `card.tsx` - New CVA-based Card component with variants (default, elevated, outlined, ghost)
  - `skeleton.tsx` - New skeleton loader component with variants (Card, Table, List)
  - Enhanced `button.tsx` with loading state support
  - Enhanced `badge.tsx` with pastel color variants (dustyRose, sage, slateBlue, warmSand, lavender, peach)
  - Enhanced `input.tsx` and `textarea.tsx` with error state support

- **UX Improvements**
  - Added `loading.tsx` to stats page for skeleton loading state
  - Documented complete screen state matrix in `docs/redesign/UX-audit.md`

- **API Improvements** (`backend/src/lib/response.ts`)
  - Created standardized API response helper functions
  - `successResponse()`, `paginatedResponse()`, `noContentResponse()`, `errorResponse()`

- **Audit Documentation** (`docs/redesign/`)
  - `ADR-001-architecture.md` - Architecture Decision Record
  - `UX-audit.md` - User journey maps, screen state matrix, UX violations
  - `api-contracts.md` - API endpoint inventory with contracts
  - `state-management.md` - State architecture audit and recommendations
  - `design-tokens.md` - Complete design token system
  - `unified-audit-report.md` - Consolidated summary of all findings

### Changed

- **Component Migration**
  - `design-system/components/Button.tsx` - Deprecated, re-exports from `ui/button`
  - `design-system/components/Badge.tsx` - Deprecated, re-exports from `ui/badge`
  - `design-system/components/Input.tsx` - Deprecated, re-exports from `ui/input`
  - `Demo.tsx` - Updated to use new ui/ components

- **Bug Fixes**
  - Fixed type errors in `login-form.tsx` and `register-form.tsx` related to error prop types
  - Fixed `PasswordInput` component to properly define props without extending InputProps

### Deprecated

- `design-system/components/Button.tsx` - Use `ui/button` instead
- `design-system/components/Badge.tsx` - Use `ui/badge` instead
- `design-system/components/Input.tsx` - Use `ui/input` instead

### Known Issues

- The native `<img>` tags in `markdown-math-renderer.tsx` and `message-input.tsx` are acceptable exceptions
  - Markdown images are from external CMS sources
  - Message input images are local blob URLs from file uploads
  - These cannot easily use `next/image` without significant refactoring

### Performance Notes

- `react-force-graph-2d` is already dynamically imported with `{ ssr: false }`
- Heavy charts use appropriate lazy loading patterns
- Skeleton loaders prevent layout shift on page loads

## [Previous Versions]

History tracked separately in git commits.

---

## Migration Guide

### Updating Imports

**Before:**

```tsx
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
```

**After:**

```tsx
import { Button, Badge } from "@/components/ui";
```

### Using New Components

**Card with variants:**

```tsx
<Card>Default</Card>
<Card variant="elevated">Elevated</Card>
<Card variant="outlined">Outlined</Card>
<Card variant="ghost">Ghost</Card>
```

**Badge with pastel variants:**

```tsx
<Badge variant="sage">Sage</Badge>
<Badge variant="lavender">Lavender</Badge>
```

**Button with loading:**

```tsx
<Button loading>Save</Button>
```
