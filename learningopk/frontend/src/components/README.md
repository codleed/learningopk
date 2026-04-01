# Components

Reusable UI components for LearningoPK, organized by domain.

## Structure

```
components/
├── ui/           # Core primitives (Button, Card, Badge, Input, etc.) — CVA + Tailwind
├── common/       # Shared higher-level components (content-renderer, stat-card, etc.)
├── layout/       # App shell (sidebar, header, layout wrapper)
├── learn/        # Learning pages (chapter, quiz, exercise, flashcard components)
├── dashboard/    # Dashboard page components
├── stats/        # Statistics and analytics components
├── forum/        # Forum thread/reply components
├── ai/           # AI tutor chat components
├── auth/         # Authentication page components
├── settings/     # Settings page components
├── admin/        # Admin panel components (out of redesign scope)
├── foundation/   # Legacy app shell (left-rail, dashboard-primitives) — used by admin
├── graph/        # Chapter relationship graph (SVG-based)
├── gamification/ # XP, streaks, progress ring components
├── navigation/   # Navigation-related components
├── MarkdownRenderer.tsx   # Markdown rendering with remark/rehype
└── VirtualizedMarkdown.tsx # Large content block-splitting renderer
```

## UI Primitives (`ui/`)

All core components use **CVA** (class-variance-authority) for variant management and `cn()` (clsx + tailwind-merge) for class composition. Import from the barrel:

```tsx
import { Button, Card, CardBody, Badge, Input, Skeleton } from "@/components/ui";
```

Available primitives:
- `Button` — primary, secondary, ghost, destructive, success variants; sm/md/lg sizes; loading state
- `Card` / `CardBody` / `CardHeader` / `CardFooter` — default, bordered, elevated variants
- `Badge` — primary, secondary, success, warning, destructive, info, outline variants
- `Input` — text input with error state support
- `Textarea` — multi-line input
- `Select` — native select (default export); `RadixSelect` for enhanced dropdown
- `Avatar` — user avatar with fallback initials
- `Progress` — linear and circular progress indicators
- `Skeleton` — loading placeholder
- `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` — tabbed navigation
- `Switch` — toggle switch
- `Tooltip` — hover tooltip
- `Dialog` / `Sheet` — modal and slide-over panels
- `Spinner` — loading spinner
- `Divider` — horizontal/vertical separator
- `EmptyState` — placeholder for empty lists
- `Alert` — info, success, warning, destructive alerts
- `ThemeToggle` / `ThemeToggleCompact` — light/dark/system theme switcher

## Common Components (`common/`)

Higher-level reusable components:
- `ContentRenderer` — dynamic import wrapper for markdown content
- `VirtualList` / `VirtualGrid` — virtualized scrolling for 20+ item lists
- `StreamingText` — animated text streaming (AI responses)
- `PageHeader` — consistent page title + breadcrumb
- `StatCard` — metric card with trend indicator
- `SubjectBadge` / `BoardBadge` — subject/board identifiers
- `ProgressRing` — circular progress indicator
- `XpBar` — experience points progress bar
- `StreakCounter` — daily streak display
- `CodeBlock` — syntax-highlighted code blocks

## Guidelines

- Always import UI primitives from `@/components/ui` (not `@/design-system/components`)
- Use CSS variables for all colors (`var(--accent-primary)`, Tailwind semantic classes)
- Follow 4px spacing grid — no arbitrary values like `mt-[13px]`
- Use `Skeleton` for all loading states
- Use `VirtualList`/`VirtualGrid` for lists exceeding 20 items
- Use dynamic imports for heavy libraries (ECharts, CodeMirror)
