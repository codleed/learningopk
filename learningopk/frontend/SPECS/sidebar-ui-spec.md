# Learningo Sidebar Redesign — UI Design Specification

**Document Version**: 1.0  
**Created**: Phase 2 (UI Designer)  
**Based on**: `sidebar-ux-spec.md`  
**Status**: Ready for Implementation

---

## 1. Design Concept: "Luminous Depth"

### Visual Direction
A **frosted glass sidebar** with luminous depth — the sidebar appears to float above the content with subtle depth, using soft shadows and gradient accents. The lime-green brand color creates **glowing active states** that feel alive. Dark mode embraces deep space tones with the primary color as an ethereal glow.

### Design Philosophy
1. **Depth through layering**: Multiple subtle shadows create the illusion of the sidebar floating
2. **Luminous accents**: Active states glow, not just fill — using subtle gradients and shadows
3. **Breathing space**: Generous padding and rounded corners create a premium feel
4. **State clarity**: Every state change is immediately obvious through color, shadow, and scale

### Distinctive Elements
- Soft inner glow on the sidebar container
- Gradient pill backgrounds for active states
- Subtle shadow lift on hover
- Icon color shifts that feel organic
- Smooth elastic animations

---

## 2. Color System

### Light Theme

```css
/* === SIDEBAR CONTAINER === */
--sidebar-bg: #ffffff;
--sidebar-bg-gradient: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
--sidebar-foreground: #1e293b;
--sidebar-border: rgba(148, 163, 184, 0.2);
--sidebar-shadow: 
  0 4px 6px -1px rgba(0, 0, 0, 0.05),
  0 10px 20px -5px rgba(0, 0, 0, 0.08),
  inset 0 1px 0 rgba(255, 255, 255, 0.8);

/* === BRAND ZONE === */
--sidebar-brand-bg: transparent;
--sidebar-brand-text: #0f172a;
--sidebar-brand-text-muted: #64748b;

/* === PRIMARY NAVIGATION === */
--sidebar-nav-default-bg: transparent;
--sidebar-nav-default-text: #64748b;
--sidebar-nav-default-icon: #94a3b8;

--sidebar-nav-hover-bg: rgba(122, 201, 67, 0.08);
--sidebar-nav-hover-text: #1e293b;
--sidebar-nav-hover-icon: #64748b;

--sidebar-nav-active-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%);
--sidebar-nav-active-text: #4a7c22;
--sidebar-nav-active-icon: #7ac943;
--sidebar-nav-active-shadow: 
  0 0 0 1px rgba(122, 201, 67, 0.3),
  0 4px 12px -2px rgba(122, 201, 67, 0.25);
--sidebar-nav-active-glow: 0 0 20px rgba(122, 201, 67, 0.15);

--sidebar-nav-focus-ring: 0 0 0 2px #7ac943;

/* === SECONDARY NAVIGATION === */
--sidebar-secondary-default-text: #94a3b8;
--sidebar-secondary-default-icon: #cbd5e1;
--sidebar-secondary-hover-bg: rgba(148, 163, 184, 0.1);
--sidebar-secondary-hover-text: #64748b;
--sidebar-secondary-active-bg: rgba(148, 163, 184, 0.15);
--sidebar-secondary-active-text: #475569;
--sidebar-secondary-active-icon: #64748b;

/* === ADMIN SECTION === */
--sidebar-admin-bg: rgba(139, 92, 246, 0.05);
--sidebar-admin-border: rgba(139, 92, 246, 0.2);
--sidebar-admin-default-text: #a78bfa;
--sidebar-admin-default-icon: #c4b5fd;
--sidebar-admin-hover-bg: rgba(139, 92, 246, 0.1);
--sidebar-admin-hover-text: #7c3aed;
--sidebar-admin-active-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
--sidebar-admin-active-text: #6d28d9;
--sidebar-admin-active-icon: #8b5cf6;

/* === SUBMENU === */
--sidebar-submenu-bg: rgba(148, 163, 184, 0.05);
--sidebar-submenu-border: rgba(148, 163, 184, 0.15);
--sidebar-submenu-item-default-text: #94a3b8;
--sidebar-submenu-item-hover-bg: rgba(148, 163, 184, 0.1);
--sidebar-submenu-item-hover-text: #64748b;
--sidebar-submenu-item-active-bg: rgba(139, 92, 246, 0.1);
--sidebar-submenu-item-active-text: #7c3aed;

/* === UTILITY CONTROLS === */
--sidebar-utility-default-text: #94a3b8;
--sidebar-utility-default-icon: #cbd5e1;
--sidebar-utility-hover-bg: rgba(148, 163, 184, 0.1);
--sidebar-utility-hover-text: #64748b;
--sidebar-utility-hover-icon: #94a3b8;

/* === PROFILE FOOTER === */
--sidebar-profile-bg: rgba(148, 163, 184, 0.05);
--sidebar-profile-border: rgba(148, 163, 184, 0.15);
--sidebar-profile-text: #1e293b;
--sidebar-profile-text-muted: #64748b;
--sidebar-profile-avatar-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%);
--sidebar-profile-avatar-text: #4a7c22;
```

### Dark Theme

```css
/* === SIDEBAR CONTAINER === */
--sidebar-bg: #0f172a;
--sidebar-bg-gradient: linear-gradient(180deg, #0f172a 0%, #0c1425 100%);
--sidebar-foreground: #f1f5f9;
--sidebar-border: rgba(71, 85, 105, 0.3);
--sidebar-shadow: 
  0 4px 6px -1px rgba(0, 0, 0, 0.3),
  0 10px 20px -5px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 rgba(255, 255, 255, 0.03);

/* === BRAND ZONE === */
--sidebar-brand-bg: transparent;
--sidebar-brand-text: #f8fafc;
--sidebar-brand-text-muted: #94a3b8;

/* === PRIMARY NAVIGATION === */
--sidebar-nav-default-bg: transparent;
--sidebar-nav-default-text: #94a3b8;
--sidebar-nav-default-icon: #64748b;

--sidebar-nav-hover-bg: rgba(122, 201, 67, 0.12);
--sidebar-nav-hover-text: #e2e8f0;
--sidebar-nav-hover-icon: #94a3b8;

--sidebar-nav-active-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.2) 0%, rgba(122, 201, 67, 0.1) 100%);
--sidebar-nav-active-text: #a3e072;
--sidebar-nav-active-icon: #7ac943;
--sidebar-nav-active-shadow: 
  0 0 0 1px rgba(122, 201, 67, 0.4),
  0 4px 16px -2px rgba(122, 201, 67, 0.35),
  0 0 30px rgba(122, 201, 67, 0.2);
--sidebar-nav-active-glow: 0 0 30px rgba(122, 201, 67, 0.25);

--sidebar-nav-focus-ring: 0 0 0 2px #7ac943;

/* === SECONDARY NAVIGATION === */
--sidebar-secondary-default-text: #64748b;
--sidebar-secondary-default-icon: #475569;
--sidebar-secondary-hover-bg: rgba(148, 163, 184, 0.12);
--sidebar-secondary-hover-text: #94a3b8;
--sidebar-secondary-active-bg: rgba(148, 163, 184, 0.18);
--sidebar-secondary-active-text: #cbd5e1;
--sidebar-secondary-active-icon: #94a3b8;

/* === ADMIN SECTION === */
--sidebar-admin-bg: rgba(139, 92, 246, 0.08);
--sidebar-admin-border: rgba(139, 92, 246, 0.25);
--sidebar-admin-default-text: #a78bfa;
--sidebar-admin-default-icon: #7c3aed;
--sidebar-admin-hover-bg: rgba(139, 92, 246, 0.15);
--sidebar-admin-hover-text: #c4b5fd;
--sidebar-admin-active-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
--sidebar-admin-active-text: #ddd6fe;
--sidebar-admin-active-icon: #a78bfa;

/* === SUBMENU === */
--sidebar-submenu-bg: rgba(30, 41, 59, 0.5);
--sidebar-submenu-border: rgba(71, 85, 105, 0.3);
--sidebar-submenu-item-default-text: #64748b;
--sidebar-submenu-item-hover-bg: rgba(148, 163, 184, 0.1);
--sidebar-submenu-item-hover-text: #94a3b8;
--sidebar-submenu-item-active-bg: rgba(139, 92, 246, 0.15);
--sidebar-submenu-item-active-text: #c4b5fd;

/* === UTILITY CONTROLS === */
--sidebar-utility-default-text: #64748b;
--sidebar-utility-default-icon: #475569;
--sidebar-utility-hover-bg: rgba(148, 163, 184, 0.12);
--sidebar-utility-hover-text: #94a3b8;
--sidebar-utility-hover-icon: #64748b;

/* === PROFILE FOOTER === */
--sidebar-profile-bg: rgba(30, 41, 59, 0.5);
--sidebar-profile-border: rgba(71, 85, 105, 0.3);
--sidebar-profile-text: #f1f5f9;
--sidebar-profile-text-muted: #94a3b8;
--sidebar-profile-avatar-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.2) 0%, rgba(122, 201, 67, 0.1) 100%);
--sidebar-profile-avatar-text: #a3e072;
```

---

## 3. Typography System

### Font Families
```css
/* Primary: Use existing brand fonts */
--sidebar-font-heading: "DM Serif Display", Georgia, serif;
--sidebar-font-body: "Source Serif 4", Georgia, serif;

/* UI Elements: System font for crisp rendering */
--sidebar-font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Type Scale
```css
/* Brand Header */
--sidebar-brand-name-size: 1rem;        /* 16px */
--sidebar-brand-name-weight: 600;       /* semibold */
--sidebar-brand-greeting-size: 0.75rem; /* 12px */
--sidebar-brand-greeting-weight: 400;   /* regular */

/* Navigation Labels */
--sidebar-nav-label-size: 0.875rem;      /* 14px */
--sidebar-nav-label-weight: 500;        /* medium */

/* Submenu Items */
--sidebar-submenu-label-size: 0.8125rem; /* 13px */
--sidebar-submenu-label-weight: 400;     /* regular */

/* Utility Text */
--sidebar-utility-label-size: 0.8125rem; /* 13px */
--sidebar-utility-label-weight: 500;     /* medium */

/* Profile Footer */
--sidebar-profile-name-size: 0.875rem;  /* 14px */
--sidebar-profile-name-weight: 600;      /* semibold */
--sidebar-profile-subtitle-size: 0.75rem;/* 12px */
--sidebar-profile-subtitle-weight: 400; /* regular */
```

### Line Heights & Letter Spacing
```css
--sidebar-line-height-tight: 1.25;
--sidebar-line-height-normal: 1.5;
--sidebar-letter-spacing-tight: -0.01em;
--sidebar-letter-spacing-normal: 0;
```

---

## 4. Spacing System

### Sidebar Dimensions
```css
/* Expanded */
--sidebar-width-expanded: 280px;
--sidebar-padding-x: 16px;

/* Collapsed */
--sidebar-width-collapsed: 72px;

/* Vertical */
--sidebar-padding-top: 20px;
--sidebar-padding-bottom: 16px;
```

### Component Spacing
```css
/* Brand Zone */
--sidebar-brand-height: 64px;
--sidebar-brand-gap: 12px;

/* Navigation Items */
--sidebar-nav-item-height: 44px;
--sidebar-nav-item-gap: 4px;
--sidebar-nav-item-padding-x: 12px;
--sidebar-nav-item-padding-y: 10px;
--sidebar-nav-item-radius: 12px;

/* Secondary Nav */
--sidebar-nav-secondary-item-height: 40px;

/* Section Dividers */
--sidebar-divider-margin-y: 12px;
--sidebar-divider-height: 1px;
--sidebar-divider-width: 100%;

/* Admin Section */
--sidebar-admin-margin-top: 8px;
--sidebar-admin-padding-y: 8px;
--sidebar-admin-border-radius: 12px;
--sidebar-admin-border-width: 1px;

/* Submenu */
--sidebar-submenu-padding-y: 8px;
--sidebar-submenu-padding-left: 24px;
--sidebar-submenu-item-height: 36px;
--sidebar-submenu-item-gap: 2px;
--sidebar-submenu-item-radius: 8px;

/* Utility Controls */
--sidebar-utility-item-height: 40px;
--sidebar-utility-item-gap: 4px;
--sidebar-utility-item-radius: 10px;

/* Profile Footer */
--sidebar-profile-height: 72px;
--sidebar-profile-padding: 12px;
--sidebar-profile-radius: 14px;
--sidebar-profile-avatar-size: 40px;
```

### Icon Sizing
```css
--sidebar-icon-size: 20px;
--sidebar-icon-size-sm: 18px;
--sidebar-avatar-initials-size: 14px;
```

---

## 5. Component Visual Specifications

### 5.1 Sidebar Container

**Expanded (280px)**
```
┌──────────────────────────────────────┐
│  Dimensions: 280px × 100vh          │
│  Padding: 20px top, 16px sides      │
│  Background: var(--sidebar-bg)      │
│  Border-right: 1px solid            │
│              var(--sidebar-border)  │
│  Box-shadow: var(--sidebar-shadow)  │
│  Overflow: auto (scrollable)        │
│  Position: fixed, left 0            │
└──────────────────────────────────────┘
```

**Collapsed (72px)**
```
┌────────────┐
│  72px wide │
│  Centered  │
│  content   │
└────────────┘
```

### 5.2 Brand Header

| Property | Value |
|----------|-------|
| Height | 64px |
| Padding | 12px horizontal |
| Background | transparent |
| Border-radius | 12px |

**Visual:**
```
┌──────────────────────────────────────┐
│  ┌──────┐                            │
│  │ Logo │  Learningo                  │
│  │28×28 │  Welcome back              │
│  └──────┘                            │
└──────────────────────────────────────┘
```

**Collapsed:**
```
┌──────────────────────────────────────┐
│         ┌──────┐                     │
│         │ Logo │                     │
│         │28×28 │                     │
│         └──────┘                     │
└──────────────────────────────────────┘
```

**Logo Specifications:**
- Size: 28×28px
- Border-radius: 8px
- Background: `--foreground` (inverted)
- Object-fit: cover
- Shadow: 0 2px 8px rgba(0,0,0,0.15)

### 5.3 Primary Navigation Item

**Default State**
| Property | Value |
|----------|-------|
| Height | 44px |
| Padding | 12px |
| Border-radius | 12px |
| Background | transparent |
| Icon color | `--sidebar-nav-default-icon` |
| Icon weight | regular |
| Text color | `--sidebar-nav-default-text` |
| Font | 14px, 500 weight |

**Hover State**
| Property | Value |
|----------|-------|
| Background | `--sidebar-nav-hover-bg` |
| Icon color | `--sidebar-nav-hover-icon` |
| Text color | `--sidebar-nav-hover-text` |
| Transform | translateX(2px) |

**Active State**
| Property | Value |
|----------|-------|
| Background | `--sidebar-nav-active-bg` |
| Icon color | `--sidebar-nav-active-icon` |
| Icon weight | fill |
| Text color | `--sidebar-nav-active-text` |
| Font weight | 600 |
| Box-shadow | `--sidebar-nav-active-shadow` |
| Border | 1px solid rgba(122, 201, 67, 0.2) |

**Focus State**
| Property | Value |
|----------|-------|
| Outline | 2px solid `--sidebar-nav-focus-ring` |
| Outline-offset | 2px |

**Layout:**
```
┌──────────────────────────────────────┐
│  ┌────┐                              │
│  │ 🏠 │  Dashboard                   │
│  └────┘                              │
└──────────────────────────────────────┘
```

**Collapsed Layout:**
```
┌──────────────────────────────────────┐
│              ┌────┐                  │
│              │ 🏠 │                  │
│              └────┘                  │
└──────────────────────────────────────┘
```

### 5.4 Secondary Navigation Item

Similar to primary but with muted styling to indicate lower priority.

| State | Background | Icon | Text |
|-------|------------|------|------|
| Default | transparent | `--sidebar-secondary-default-icon` | `--sidebar-secondary-default-text` |
| Hover | `--sidebar-secondary-hover-bg` | `--sidebar-secondary-hover-icon` | `--sidebar-secondary-hover-text` |
| Active | `--sidebar-secondary-active-bg` | `--sidebar-secondary-active-icon` | `--sidebar-secondary-active-text` |

### 5.5 Admin Section

**Container (expanded)**
```
┌──────────────────────────────────────┐
│  ┌─ Admin Section ─────────────────┐  │
│  │  Background: var(--sidebar-admin-bg)  │
│  │  Border: 1px solid var(--sidebar-admin-border)  │
│  │  Border-radius: 12px          │
│  │  Padding: 8px                  │
│  │                                │
│  │  ┌──────────────────────────┐  │
│  │  │ 🛡️ Admin           ▾    │  │
│  │  └──────────────────────────┘  │
│  │                                │
│  │    ┌────────────────────────┐  │
│  │    │  ├─ Command Center    │  │
│  │    │  ├─ Users            │  │
│  │    │  └─ ...              │  │
│  │    └────────────────────────┘  │
│  └───────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Admin Toggle Button**
| State | Background | Icon | Text |
|-------|------------|------|------|
| Default | transparent | `--sidebar-admin-default-icon` | `--sidebar-admin-default-text` |
| Hover | `--sidebar-admin-hover-bg` | `--sidebar-admin-hover-icon` | `--sidebar-admin-hover-text` |
| Active | `--sidebar-admin-active-bg` | `--sidebar-admin-active-icon` | `--sidebar-admin-active-text` |

**Collapsed Admin**
```
┌──────────────────────────────────────┐
│           ┌──────────────────┐       │
│           │        🛡️        │       │
│           └──────────────────┘       │
└──────────────────────────────────────┘
```

### 5.6 Submenu Item

| State | Background | Text | Indent |
|-------|------------|------|--------|
| Default | transparent | `--sidebar-submenu-item-default-text` | 24px |
| Hover | `--sidebar-submenu-item-hover-bg` | `--sidebar-submenu-item-hover-text` | 24px |
| Active | `--sidebar-submenu-item-active-bg` | `--sidebar-submenu-item-active-text` | 24px |

**Dimensions:**
- Height: 36px
- Padding: 8px 12px
- Font: 13px, 400 weight
- Border-radius: 8px

### 5.7 Divider

```
┌──────────────────────────────────────┐
│  ─────────────────────────────────   │
│  Height: 1px                         │
│  Margin: 12px vertical                │
│  Color: var(--sidebar-border)         │
│  Opacity: 0.5                        │
└──────────────────────────────────────┘
```

**Alternative with section label:**
```
┌──────────────────────────────────────┐
│  ─────────── TOOLS ───────────        │
│  Height: 1px (decorative line)        │
│  Label: 10px, uppercase,              │
│         var(--sidebar-foreground)     │
│         opacity 0.3                  │
└──────────────────────────────────────┘
```

### 5.8 Utility Button

**Theme Toggle (Compact)**
```
┌──────────────────────────────────────┐
│           ┌──────────────────┐       │
│           │    ◐ ☀️ 🌙      │       │
│           └──────────────────┘       │
│           Height: 36px               │
│           Border-radius: 10px        │
└──────────────────────────────────────┘
```

**Standard Utility Button**
| State | Background | Icon | Text |
|-------|------------|------|------|
| Default | transparent | `--sidebar-utility-default-icon` | `--sidebar-utility-default-text` |
| Hover | `--sidebar-utility-hover-bg` | `--sidebar-utility-hover-icon` | `--sidebar-utility-hover-text` |

**Dimensions:**
- Height: 40px
- Padding: 10px 12px
- Border-radius: 10px
- Font: 13px, 500 weight

### 5.9 Sign Out Button

**Layout:**
```
┌──────────────────────────────────────┐
│  ┌────┐                              │
│  │ →  │  Sign Out                    │
│  └────┘                              │
└──────────────────────────────────────┘
```

| State | Background | Icon | Text |
|-------|------------|------|------|
| Default | transparent | `--sidebar-utility-default-icon` | `--sidebar-utility-default-text` |
| Hover | `rgba(239, 68, 68, 0.08)` | `#ef4444` | `#ef4444` |
| Active | `rgba(239, 68, 68, 0.12)` | `#dc2626` | `#dc2626` |

### 5.10 User Profile Footer

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────────┐│
│  │ Background: var(--sidebar-profile-bg)       │
│  │ Border: 1px solid var(--sidebar-profile-border)  │
│  │ Border-radius: 14px              │
│  │ Padding: 12px                   │
│  │                                  │
│  │  ┌────┐                          │
│  │  │ JD │  John Doe               │
│  │  └────┘  View Profile →         │
│  │                                  │
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

**Avatar:**
- Size: 40×40px (expanded), 40×40px (collapsed)
- Border-radius: 50%
- Background: `--sidebar-profile-avatar-bg`
- Text: `--sidebar-profile-avatar-text`, 14px bold
- Font: `--sidebar-font-ui`

**Collapsed Profile:**
```
┌──────────────────────────────────────┐
│              ┌────┐                  │
│              │ JD │                  │
│              └────┘                  │
└──────────────────────────────────────┘
```

### 5.11 Tooltip (Collapsed Mode)

**Trigger:** Hover on icon-only nav item

**Visual:**
```
┌──────────────────────────────────────┐
│           ┌────────────────┐         │
│           │  Dashboard     │         │
│           │  (left arrow)  │         │
│           └────────────────┘         │
│                  ↑                   │
│              8px gap                 │
└──────────────────────────────────────┘
```

**Properties:**
- Background: `#1e293b` (light), `#0f172a` (dark)
- Text: white
- Font: 12px, 500 weight
- Padding: 8px 12px
- Border-radius: 8px
- Position: right of icon, centered vertically
- Box-shadow: 0 4px 12px rgba(0,0,0,0.15)
- Animation: fade in 150ms ease

**Positioning:**
```
┌────────┬────────────────────────────────────┐
│  Icon  │  Tooltip appears to the right     │
│   🏠   │  with 8px gap                     │
│        │  Pointing arrow on left edge      │
└────────┴────────────────────────────────────┘
```

---

## 6. Animation & Transition Specifications

### Timing Functions
```css
--sidebar-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--sidebar-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--sidebar-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
--sidebar-transition-bounce: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Animation Inventory

| Animation | Duration | Easing | Properties |
|-----------|----------|--------|------------|
| Nav item hover | 150ms | ease-out | background, color, transform |
| Nav item active | 200ms | ease-out | background, shadow, border |
| Submenu expand | 250ms | ease-out | max-height, opacity |
| Submenu collapse | 200ms | ease-in | max-height, opacity |
| Sidebar collapse | 300ms | ease-in-out | width |
| Tooltip appear | 150ms | ease-out | opacity, transform |
| Focus ring | 0ms | - | Immediate |
| Avatar hover | 200ms | ease-out | ring, scale |

### Hover Animations

**Nav Item Hover:**
```css
.nav-item:hover {
  background-color: var(--sidebar-nav-hover-bg);
  transform: translateX(2px);
  transition: all var(--sidebar-transition-fast);
}
```

**Nav Item Active (with glow):**
```css
.nav-item.active {
  background: var(--sidebar-nav-active-bg);
  box-shadow: var(--sidebar-nav-active-shadow);
  transition: all var(--sidebar-transition-normal);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: var(--sidebar-nav-active-glow);
  border-radius: inherit;
  z-index: -1;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

### Collapse Animation

**Sidebar width transition:**
```css
.sidebar {
  width: var(--sidebar-width-expanded);
  transition: width var(--sidebar-transition-slow);
}

.sidebar.collapsed {
  width: var(--sidebar-width-collapsed);
}
```

**Label fade out:**
```css
.nav-label {
  opacity: 1;
  transition: opacity var(--sidebar-transition-fast);
}

.sidebar.collapsed .nav-label {
  opacity: 0;
  pointer-events: none;
}
```

---

## 7. Icon System

### Recommended Phosphor Icons

| Navigation Item | Icon (Light weight) | Icon (Fill weight) |
|-----------------|---------------------|-------------------|
| Dashboard | `House` | `HouseFill` |
| Subjects | `Books` | `BooksFill` |
| AI Tutor | `Robot` | `RobotFill` |
| Stats | `ChartPieSlice` | `ChartPieSliceFill` |
| Forum | `ChatCircle` | `ChatCircleFill` |
| Calendar | `Calendar` | `CalendarFill` |
| Settings | `Gear` | `GearFill` |
| Admin | `ShieldCheck` | `ShieldCheckered` |
| Collapse | `CaretDoubleLeft` / `CaretDoubleRight` | - |
| Sign Out | `SignOut` | - |
| Theme | `Sun` / `Moon` | `CircleHalf` |

### Icon Specifications

```css
.sidebar-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: all var(--sidebar-transition-fast);
}

.sidebar-icon.weight-light {
  font-weight: 100;
}

.sidebar-icon.weight-regular {
  font-weight: 400;
}

.sidebar-icon.weight-fill {
  font-weight: 900;
}
```

### Icon Transitions
- Default → Hover: `weight-regular` → `weight-light` (150ms)
- Default → Active: `weight-regular` → `weight-fill` (150ms)
- Fill icons maintain fill weight in all states

---

## 8. Dark Mode Visual Differences

### Key Changes

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Container | White with inner light | Deep navy with inner dark |
| Active glow | Soft lime pulse | Bright lime with more intense glow |
| Admin section | Purple tint | Brighter purple glow |
| Dividers | Subtle gray | Subtle slate |
| Text contrast | High contrast | Slightly softer for comfort |

### Dark Mode Specifics

**Active State Glow (Dark Mode Enhanced):**
```css
.dark .nav-item.active {
  box-shadow: 
    0 0 0 1px rgba(122, 201, 67, 0.4),
    0 4px 16px -2px rgba(122, 201, 67, 0.35),
    0 0 30px rgba(122, 201, 67, 0.25); /* Enhanced glow */
}

.dark .nav-item.active::before {
  background: 0 0 30px rgba(122, 201, 67, 0.25);
  animation-duration: 3s; /* Slower pulse */
}
```

---

## 9. Polish Details

### Custom Scrollbar
```css
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: var(--sidebar-border);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--sidebar-foreground);
  opacity: 0.3;
}
```

### Selection Color
```css
.sidebar ::selection {
  background: rgba(122, 201, 67, 0.3);
  color: inherit;
}
```

### Focus Indicators
```css
/* Visible focus for keyboard navigation */
.nav-item:focus-visible,
.utility-button:focus-visible,
.profile-link:focus-visible {
  outline: 2px solid var(--sidebar-nav-focus-ring);
  outline-offset: 2px;
}
```

### Smooth Scrolling
```css
.sidebar {
  scroll-behavior: smooth;
}
```

---

## 10. Responsive Behavior

### Mobile (<768px)

**Overlay Pattern:**
```
┌─────────────────────────────────────┐
│  ☰  (hamburger in header)           │
├─────────────────────────────────────┤
│                                     │
│           Main Content              │
│                                     │
└─────────────────────────────────────┘
       ↓ overlay slides from left
┌─────────────────────────────────────┐
│ ╳  Brand Header                     │
│ ─────────────────────────────────   │
│    Navigation Items                 │
│    (scrollable if overflow)         │
│ ─────────────────────────────────   │
│    Sign Out                         │
│    Profile                          │
└─────────────────────────────────────┘
```

**Overlay Specifications:**
- Width: 280px (full height)
- Background: var(--sidebar-bg)
- Box-shadow: 20px 0 40px rgba(0,0,0,0.2)
- Animation: slide in from left 300ms
- Backdrop: semi-transparent overlay on content (optional)

### Tablet (768-1023px)

**Behavior:**
- Default: Collapsed (72px)
- Expandable via toggle
- Tooltips always visible on hover

### Desktop (≥1024px)

**Behavior:**
- Default: Expanded (280px)
- User preference overrides
- Collapsible via toggle

---

## 11. Component States Summary

### Primary NavItem

| State | BG | Icon | Text | Shadow | Border |
|-------|----|------|------|--------|--------|
| Default | transparent | #94a3b8 | #64748b | none | none |
| Hover | rgba(122,201,67,0.08) | #64748b | #1e293b | none | none |
| Active | gradient(135deg,rgba(122,201,67,0.15)) | #7ac943 | #4a7c22 | glow | 1px solid rgba |
| Focus | transparent | - | - | ring | ring |

### Admin Submenu Item

| State | BG | Text |
|-------|----|------|
| Default | transparent | #a78bfa |
| Hover | rgba(139,92,246,0.1) | #c4b5fd |
| Active | rgba(139,92,246,0.15) | #ddd6fe |

### Sign Out Button

| State | BG | Icon | Text |
|-------|----|------|------|
| Default | transparent | #cbd5e1 | #94a3b8 |
| Hover | rgba(239,68,68,0.08) | #ef4444 | #ef4444 |
| Active | rgba(239,68,68,0.12) | #dc2626 | #dc2626 |

---

## 12. Handoff to Implementation

### Design Summary
- **Concept**: "Luminous Depth" — frosted glass aesthetic with glowing active states
- **Brand Color**: Lime green (#7ac943) used for luminous active states
- **Typography**: Existing fonts (DM Serif Display, Source Serif 4) with system UI for crispness
- **Spacing**: 280px expanded, 72px collapsed, generous internal padding
- **Animations**: Smooth 150-350ms transitions, bounce easing for interactions

### Implementation Priority
1. Color variables in theme.css (both light and dark)
2. Sidebar container and layout
3. Brand header
4. Primary navigation items (all states)
5. Secondary navigation items
6. Admin section with submenu
7. Utility controls (theme, collapse, sign out)
8. Profile footer
9. Tooltips for collapsed mode
10. Responsive overlay behavior
11. Animations and polish

### Key Implementation Notes
- Use CSS custom properties for all colors
- Implement glow effect with pseudo-elements and box-shadow
- Use Tailwind's `transition-*` utilities with custom timing
- Ensure ARIA attributes match visual states
- Test keyboard navigation thoroughly
- Verify color contrast meets WCAG AA

---

**UI Designer**: Complete  
**Next**: → Frontend Developer Implementation Phase
