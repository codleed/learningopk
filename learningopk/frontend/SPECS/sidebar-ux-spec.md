# Learningo Sidebar Redesign — UX Specification

**Document Version**: 1.0  
**Created**: Phase 1 (UX Architect)  
**Status**: Ready for UI Design  
**Framework Context**: Next.js 16 + React 19 + Tailwind CSS v4

---

## 1. Executive Summary

This document defines the UX architecture for a completely redesigned left rail (sidebar) navigation for Learningo — a gamified learning platform. The redesign aims to:

- Improve information architecture and navigation clarity
- Enhance visual hierarchy with clear grouping
- Optimize for both expanded and collapsed states
- Maintain accessibility compliance (WCAG 2.1 AA)
- Support the platform's lime-green brand identity while introducing visual distinction

---

## 2. Navigation Architecture

### 2.1 Proposed Structure (Restructured)

The sidebar is reorganized into **4 distinct zones** with clear visual separation:

| Zone | Position | Purpose | Items |
|------|----------|---------|-------|
| **Brand Zone** | Top | Identity & quick access | Logo + User Greeting |
| **Primary Zone** | Upper-middle | Core learning features | Dashboard, Subjects, AI Tutor, Stats, Forum |
| **Management Zone** | Lower-middle | Secondary features | Calendar, Settings |
| **Admin Zone** | Conditional | Admin-only section | Admin (expandable submenu) |
| **Utility Zone** | Bottom | User account & controls | Collapse toggle, Theme, Sign Out, Profile |

### 2.2 Navigation Grouping Rationale

```
┌─────────────────────────────────┐
│  BRAND ZONE                     │  ← First impression, identity
│  Logo + "Welcome, [Name]"       │
├─────────────────────────────────┤
│  PRIMARY NAVIGATION             │  ← Most-used, learning-centric
│  ├─ Dashboard (home)            │
│  ├─ Subjects                    │
│  ├─ AI Tutor                    │
│  ├─ Stats                       │
│  └─ Forum                       │
├─────────────────────────────────┤
│  SECONDARY NAVIGATION           │  ← Supporting features
│  ├─ Calendar                    │
│  └─ Settings                    │
├─────────────────────────────────┤
│  ADMIN SECTION (if admin role)   │  ← Elevated access, visually distinct
│  └─ Admin (expandable)           │
├─────────────────────────────────┤
│  UTILITY ZONE                   │  ← User controls, always visible
│  ├─ Collapse                    │
│  ├─ Theme Toggle                 │
│  ├─ Sign Out                    │
│  └─ Profile                      │
└─────────────────────────────────┘
```

### 2.3 Hierarchy & Priority

**Priority 1 — Primary Learning (always visible, prominent)**:
- Dashboard (entry point, default active)
- Subjects (core content)
- AI Tutor (differentiating feature)
- Stats (progress tracking)
- Forum (community engagement)

**Priority 2 — Supporting Features**:
- Calendar (schedule management)
- Settings (configuration)

**Priority 3 — Admin Features** (conditional):
- Admin (expandable to reveal 9 sub-items)
  - Command Center, Users, Content, Moderation, Community, Forum, Analytics, Audit, Notifications, Settings

**Priority 4 — Utilities**:
- Collapse toggle (persistent control)
- Theme toggle (preference)
- Sign Out (security)
- User Profile (identity)

---

## 3. Interaction States

### 3.1 Navigation Item States

| State | Visual Treatment | Purpose |
|-------|-----------------|---------|
| **Default** | Muted text/icon, no background | Resting state |
| **Hover** | Elevated background, full text color | Affordance hint |
| **Active/Current** | Primary color fill, elevated shadow | Location indicator |
| **Focus** | Visible focus ring (keyboard nav) | Accessibility |
| **Disabled** | Reduced opacity, no interaction | Conditional access |

### 3.2 State Transition Specifications

```css
/* Timing */
--transition-duration-fast: 150ms;
--transition-duration-normal: 250ms;
--transition-duration-slow: 350ms;

/* Hover → Active transitions */
- Background: transparent → accent → primary
- Icon weight: regular → (hover: light) → (active: fill)
- Text: muted → full → primary
- Shadow: none → soft shadow → elevated shadow
```

### 3.3 Collapse/Expand Behavior

**Trigger**: Collapse toggle button at bottom of sidebar

**Expanded State (default)**:
- Width: 280px (16rem)
- Shows: Full icon + label + submenu items
- Animation: Smooth width transition

**Collapsed State**:
- Width: 72px (4.5rem)
- Shows: Icon only with tooltip on hover
- Animation: Smooth width transition + text fade-out

**Animation Sequence**:
1. Width begins transitioning
2. Labels fade out (150ms)
3. Content area compresses
4. Tooltip appears on hover

**Persistence**: State saved to localStorage (`learningo-sidebar-collapsed`)

---

## 4. Information Architecture

### 4.1 Expanded Mode Layout

```
┌────────────────────────────────────┐
│  [Logo]     Learningo             │  ← Brand: 64px height
│             ─────────────────────  │
├────────────────────────────────────┤
│                                    │
│  🏠 Dashboard                      │  ← Primary nav items
│  📚 Subjects                       │     48px each
│  🤖 AI Tutor                       │
│  📊 Stats                          │
│  💬 Forum                          │
│                                    │
├────────────────────────────────────┤
│  ─────────────────────             │  ← Visual divider
│                                    │
│  📅 Calendar                       │  ← Secondary nav items
│  ⚙️ Settings                      │     48px each
│                                    │
├────────────────────────────────────�
│  🛡️ Admin ▾                       │  ← Conditional section
│    ├─ Command Center               │     Indented 24px
│    ├─ Users                        │
│    ├─ Content                      │
│    └─ ... (9 total)                │
│                                    │
├────────────────────────────────────┤
│  [Theme Toggle]                    │
│  [Collapse ↔]                      │  ← Utility controls
│  [Sign Out →]                      │
│                                    │
├────────────────────────────────────┤
│  👤 John Doe                       │  ← Profile footer
│     View Profile                   │     72px height
└────────────────────────────────────┘
```

### 4.2 Collapsed Mode Layout

```
┌──────┐
│ [L]  │  ← Logo only
├──────┤
│  🏠  │  ← Icon + tooltip on hover
│  📚  │     "Dashboard"
│  🤖  │     "Subjects"
│  📊  │     etc.
│  💬  │
├──────┤
│  📅  │
│  ⚙️  │
├──────┤
│  🛡️  │
├──────┤
│  ◐   │  ← Theme (compact)
│  ↔   │  ← Collapse
│  →   │  ← Sign Out
├──────┤
│  [JD]│  ← Avatar initials
└──────┘
```

---

## 5. Accessibility Requirements

### 5.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between nav items |
| `Enter` / `Space` | Activate nav item / toggle submenu |
| `Escape` | Close expanded submenu |
| `←` / `→` | Navigate within expanded submenu (admin) |

### 5.2 Focus Management

- **Focus indicator**: 2px solid primary color outline with 2px offset
- **Focus trap**: Within sidebar when expanded
- **Skip link**: "Skip to main content" at top of page

### 5.3 Screen Reader Support

```html
<aside aria-label="Main navigation">
  <nav aria-label="Primary">
    <a href="/dashboard" aria-current="page">Dashboard</a>
  </nav>
  <nav aria-label="Secondary">
    <a href="/calendar">Calendar</a>
  </nav>
  <button aria-expanded="false" aria-controls="admin-submenu">
    Admin
  </button>
</aside>
```

### 5.4 ARIA Patterns

| Component | ARIA Pattern |
|-----------|--------------|
| Nav items | `role="menuitem"` with `aria-current="page"` when active |
| Admin submenu | `role="menu"`, `aria-expanded`, `aria-controls` |
| Collapse button | `aria-label="Collapse sidebar"` / `"Expand sidebar"` |
| Theme toggle | `role="switch"`, `aria-checked` |

### 5.5 Color Contrast

- **Minimum**: 4.5:1 for text
- **Large text**: 3:1 minimum
- **Interactive elements**: 3:1 minimum against adjacent colors
- **Focus indicators**: Must meet 3:1 against all backgrounds

---

## 6. Responsive Behavior

### 6.1 Breakpoints

| Breakpoint | Sidebar Behavior |
|------------|------------------|
| **Mobile** (<768px) | Overlay mode: hidden by default, hamburger trigger |
| **Tablet** (768-1023px) | Collapsed by default, expandable |
| **Desktop** (≥1024px) | Expanded by default, collapsible |

### 6.2 Mobile Overlay Pattern

```
┌─────────────────────────────────────┐
│  Content Area                       │
│  (hamburger menu icon in top-left)  │
│                                     │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
         ↓ (tap hamburger)
┌─────────────────────────────────────┐
│ ╳  [Sidebar Overlay - 280px]       │
│    ┌─────────────────────────────┐  │
│    │  Logo + Welcome             │  │
│    │  ───────────────────────    │  │
│    │  Dashboard                  │  │
│    │  Subjects                   │  │
│    │  ...                        │  │
│    │  ───────────────────────    │  │
│    │  Settings                   │  │
│    │  ───────────────────────    │  │
│    │  Sign Out                   │  │
│    │  Profile                    │  │
│    └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 6.3 Touch Targets

- **Minimum size**: 44x44px (WCAG requirement)
- **Spacing**: 8px minimum between targets
- **Current nav items**: 48px height (exceeds minimum)

---

## 7. User Flow & Edge Cases

### 7.1 Initial Load Flow

1. Check localStorage for sidebar preference
2. If first visit → default to expanded (desktop) / collapsed (mobile)
3. Apply state without animation on initial render
4. Animate subsequent state changes

### 7.2 Admin Submenu Flow

```
User clicks "Admin" →
  ├─ If collapsed: Navigate to /admin
  └─ If expanded:
       ├─ First click: Expand submenu (animation)
       ├─ Subsequent clicks: Toggle open/close
       └─ Click sub-item: Navigate, close submenu
```

### 7.3 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Very long user name | Truncate with ellipsis after 20 characters |
| Many admin sub-items | Scrollable submenu if exceeds 5 items visible |
| Theme toggle in collapsed mode | Icon-only with tooltip |
| Sign out confirmation | Keep current behavior (modal) |
| Page not found | Highlight matching nav item anyway |

---

## 8. Recommendations for UI Design

### 8.1 Visual Direction Suggestions

1. **Elevated card aesthetic**: The sidebar should feel like an elevated card with subtle shadow
2. **Generous internal spacing**: 16px horizontal padding, 8px between items
3. **Clear section dividers**: Subtle horizontal rules or spacing to delineate zones
4. **Active state prominence**: Use brand color (lime green) to make active state unmistakable
5. **Collapsed state polish**: Tooltips are essential; consider subtle indicator for active items

### 8.2 Icon Recommendations

- **Primary nav**: Outlined icons that fill on active
- **Secondary nav**: Lighter weight to convey lower priority
- **Admin**: Shield or settings-cog to indicate elevated access
- **Utility zone**: Compact icons, muted until hovered

### 8.3 Typography Suggestions

- **Brand zone**: Medium weight, slightly larger
- **Nav labels**: Regular weight, 14px, medium tracking
- **Submenu items**: Slightly smaller (13px), lighter color
- **Dividers**: Optional section labels (ALL CAPS, 10px, very muted)

---

## 9. Component Inventory

| Component | States | Notes |
|-----------|--------|-------|
| `SidebarContainer` | expanded, collapsed, mobile-overlay | Main wrapper |
| `BrandHeader` | default | Logo + greeting |
| `NavSection` | default | Section wrapper with optional label |
| `NavItem` | default, hover, active, focus, disabled | Single navigation link |
| `NavItemWithSubmenu` | collapsed, expanded, item-active | Admin section |
| `Submenu` | open, closed | Animated reveal |
| `SubmenuItem` | default, hover, active, focus | Admin sub-links |
| `Divider` | default | Visual separator |
| `UtilityButton` | default, hover, focus | Theme, collapse, sign out |
| `UserProfile` | default, hover | Bottom profile area |
| `Tooltip` | visible on collapsed hover | For icon-only mode |

---

## 10. Implementation Checklist

### Phase 1 (UX) — COMPLETE ✓
- [x] Navigation hierarchy defined
- [x] State behaviors specified
- [x] Accessibility requirements documented
- [x] Responsive patterns outlined
- [x] Edge cases addressed

### Phase 2 (UI Design) — PENDING
- [ ] Color system specification
- [ ] Typography scale
- [ ] Spacing system
- [ ] Component visual specs
- [ ] All state designs
- [ ] Dark mode design

### Phase 3 (Implementation) — PENDING
- [ ] React component implementation
- [ ] CSS/Tailwind styling
- [ ] Animation implementation
- [ ] Accessibility implementation
- [ ] Responsive behavior
- [ ] Testing

---

## 11. Handoff to UI Designer

**Input Summary**:
- 4-zone navigation structure
- Collapsed/expanded states defined
- Accessibility requirements specified
- Responsive breakpoints provided
- Framework: Next.js + Tailwind CSS

**Creative Freedom Areas**:
- Visual aesthetic within the defined structure
- Color application (brand lime green is required)
- Typography details
- Icon style (open to alternatives)
- Animation specifics
- Shadow/elevation treatment

**Constraints**:
- Must support both light and dark themes
- Must maintain Phosphor Icons OR provide icon replacements
- Must be pixel-clean at 280px expanded / 72px collapsed
- Must meet WCAG 2.1 AA accessibility
- Must preserve existing functionality

---

**UX Architect**: Complete  
**Next**: → UI Designer Phase
