# LearningoPK UI Design System - Authentication Screens

> Documentation for the authentication screens redesign (March 2026)
> Use this as a reference for applying consistent design patterns to other screens.

---

## Design Decisions Summary

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Visual Style | Clean minimalist white/slate with green primary | Professional, trustworthy, educational focus |
| Background | Hero Illustration (learning-themed) | Engaging, branded left panel on desktop |
| Form Fields | rounded-lg (8px) with top labels | Modern, accessible, clear hierarchy |
| Animations | Light (subtle fade + focus transitions) | Polished feel without distraction |
| Social Login | Not included | Simplified for MVP |

---

## Color System

### Primary Colors

```css
--color-primary: #7ac943;        /* Brand green - CTAs, links, focus */
--color-primary-hover: #68b036;   /* Darker green for hover states */
--color-primary-light: rgba(122, 201, 67, 0.2); /* Focus ring */
```

### Neutral Palette (Slate)

```css
--color-slate-50: #f8fafc;   /* Page background */
--color-slate-100: #f1f5f9;   /* Card background, secondary areas */
--color-slate-200: #e2e8f0;   /* Borders */
--color-slate-300: #cbd5e1;   /* Input borders */
--color-slate-400: #94a3b8;   /* Placeholder text, icons */
--color-slate-500: #64748b;   /* Secondary text */
--color-slate-600: #475569;   /* Secondary text */
--color-slate-700: #334155;   /* Labels */
--color-slate-800: #1e293b;   /* Body text */
--color-slate-900: #0f172a;   /* Headings */
```

### Semantic Colors

```css
--color-error: #ef4444;        /* Validation errors */
--color-error-bg: #fef2f2;     /* Error backgrounds */
--color-error-border: #fecaca; /* Error borders */
--color-success: #10b981;      /* Success states */
--color-success-bg: #ecfdf5;  /* Success backgrounds */
```

### Usage Pattern

```tsx
// Primary actions (buttons, links, focus states)
text-[#7ac943]
bg-[#7ac943]
hover:bg-[#68b036]
focus:border-[#7ac943]
focus:ring-[#7ac943]/20

// Neutral text hierarchy
text-slate-900   // Headings, primary content
text-slate-600   // Secondary text, links
text-slate-500   // Helper text, placeholders

// Borders
border-slate-200   // Card borders
border-slate-300   // Input borders

// Backgrounds
bg-white          // Card surfaces
bg-slate-50       // Page backgrounds
```

---

## Typography

### Font Stack

- **Headings**: `font-display` (DM Serif Display) - Bold, distinctive
- **Body**: Default sans-serif - Clean readability

### Size Scale

```tsx
// Headings
text-3xl  // 30px - Page titles
text-2xl  // 24px - Card titles

// Body
text-base // 16px - Input text, paragraphs
text-sm   // 14px - Labels, secondary text

// Small
text-xs   // 12px - Helper text, errors
```

### Weight Scale

```tsx
font-bold      // 700 - Headings, primary actions
font-semibold  // 600 - Labels, important text
font-medium    // 500 - Links, secondary actions
font-normal    // 400 - Body text, inputs
```

---

## Spacing System (8pt Grid)

### Component Spacing

```tsx
// Card
p-8             // 32px - Card internal padding
rounded-2xl    // 16px - Card border radius

// Form fields
space-y-5      // 20px - Gap between form fields
h-12           // 48px - Input height (touch target)
rounded-lg     // 8px - Input border radius

// Between sections
space-y-6      // 24px - Section separation
mt-8           // 32px - Heading to content
```

---

## Component Architecture

### 1. AuthLayout (`auth-layout.tsx`)

The main wrapper for all authentication screens.

```tsx
import { AuthLayout } from "@/components/auth/auth-layout";

<AuthLayout
  title="Welcome Back"
  subtitle="Sign in to continue your learning journey"
  topLink={{ href: "/register", label: "Create account" }}
  showHero={true}  // Show/hide hero illustration
>
  <LoginForm />
</AuthLayout>
```

**Props:**
- `title: string` - Page heading
- `subtitle: string` - Description below heading
- `topLink?: { href: string, label: string }` - Top right navigation link
- `showHero?: boolean` - Show hero illustration (default: true, false for password reset)

**Layout Behavior:**
- Desktop: Split view - Hero left (40%), Form right (60%)
- Mobile: Stacked - Hero top banner, form below
- Full-height centered layout

### 2. HeroIllustration (`hero-illustration.tsx`)

SVG illustration for the left panel.

```tsx
import { HeroIllustration } from "@/components/auth/hero-illustration";
```

**Usage:** Automatically included in AuthLayout. Can be used standalone if needed.

**Customization:** The SVG can be modified to change:
- Colors (match gradient definitions)
- Elements (add/remove icons)
- Size (viewBox adjustment)

### 3. FormField (`form-field.tsx`)

Reusable form field wrapper with label and error handling.

```tsx
import { FormField } from "@/components/auth/form-field";

<FormField
  htmlFor="email"
  label="Email Address"
  error={emailError}
  action={<Link href="/forgot">Forgot?</Link>}
>
  <Input ... />
</FormField>
```

**Props:**
- `htmlFor: string` - Label for attribute
- `label: string` - Label text
- `error?: string | null` - Error message to display
- `action?: ReactNode` - Optional right-side content (links, buttons)
- `children: ReactNode` - Input component

### 4. PasswordInput (`password-input.tsx`)

Enhanced input for passwords with visibility toggle.

```tsx
import { PasswordInput } from "@/components/auth/password-input";
import { LockKeyhole } from "lucide-react";

<PasswordInput
  name="password"
  label="Password"
  icon={LockKeyhole}
  iconPosition="left"
  placeholder="••••••••"
  error={passwordError}
  action={<Link href="/forgot">Forgot?</Link>}
/>
```

**Props:**
- Extends InputProps
- `label: string` - Label text
- `icon?: LucideIcon` - Icon component
- `iconPosition?: "left" | "right"` - Icon position
- `error?: string | null` - Error message

### 5. Input (`components/ui/input.tsx`)

Base input component.

```tsx
<Input
  id="email"
  name="email"
  type="email"
  placeholder="name@example.com"
  className="h-12 rounded-lg border-slate-200 bg-white px-10 text-base
             text-slate-900 placeholder:text-slate-400
             focus:border-[#7ac943] focus:ring-2 focus:ring-[#7ac943]/20"
/>
```

### 6. Button (`components/ui/button.tsx`)

Primary action button.

```tsx
import { Button } from "@/components/ui/button";

<Button
  type="submit"
  width="full"
  size="lg"
  disabled={isPending}
  className="h-12 rounded-lg bg-[#7ac943] text-base font-semibold
             text-white shadow-sm hover:bg-[#68b036]"
>
  Sign In
</Button>
```

---

## Input Field Styling Pattern

Use this consistent pattern for all form inputs:

```tsx
className={`
  h-12                           // 48px height (touch target)
  rounded-lg                     // 8px radius
  border-slate-200               // Border color
  bg-white                      // Background
  px-10                         // Padding (accommodates icon)
  text-base                     // 16px font size
  text-slate-900                // Text color
  placeholder:text-slate-400    // Placeholder color
  focus:border-[#7ac943]        // Focus border (primary)
  focus:ring-2                  // Focus ring
  focus:ring-[#7ac943]/20       // Focus ring with transparency
`}
```

---

## Layout Patterns

### Card Container

For consistent card styling:

```tsx
<div className="
  bg-white             // White background
  rounded-2xl         // 16px border radius
  border border-slate-200  // Subtle border
  shadow-sm           // Subtle shadow
  p-8                 // 32px internal padding
">
  {/* Content */}
</div>
```

### Page Header Pattern

```tsx
<div className="text-center mb-8">
  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
    {title}
  </h1>
  <p className="mt-2 text-sm sm:text-base text-slate-500">
    {subtitle}
  </p>
</div>
```

### Form Layout

```tsx
<form className="space-y-5" noValidate>
  {/* Form fields with 20px gap */}
  <FormField label="Email">
    <Input ... />
  </FormField>

  <FormField label="Password">
    <Input ... />
  </FormField>

  {/* Full-width button */}
  <Button width="full" size="lg">Submit</Button>
</form>
```

### Two-Column Form Fields

```tsx
<div className="grid gap-4 sm:grid-cols-2">
  <FormField label="First">
    <Input ... />
  </FormField>
  <FormField label="Second">
    <Input ... />
  </FormField>
</div>
```

---

## Animation Guidelines

### Light Animations Only

For subtle, professional animations:

```tsx
// Focus transition (200ms)
focus:border-[#7ac943] focus:ring-2 focus:ring-[#7ac943]/20

// Button hover (150ms)
hover:bg-[#68b036]
hover:shadow-md

// Button press (100ms)
active:scale-[0.98]
```

### Entrance Animations (Optional)

If adding page load animations:

```tsx
// Card fade up (400ms)
<div className="animate-fade-up">
  {/* Content */}
</div>

// CSS:
// @keyframes fade-up {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fade-up { animation: fade-up 400ms ease-out; }
```

---

## Accessibility Guidelines

### Focus States

Always include visible focus indicators:

```tsx
focus:border-[#7ac943]
focus:ring-2
focus:ring-[#7ac943]/20
focus:ring-offset-2
```

### Labels & ARIA

```tsx
<FormField htmlFor="email" label="Email Address" error={error}>
  <Input
    id="email"
    aria-invalid={error ? true : undefined}
    aria-label="Email"
  />
</FormField>
```

### Touch Targets

- Minimum 44px height for interactive elements
- 48px for inputs (h-12)
- 44px minimum for buttons (h-11)

### Color Contrast

- Text on white: `text-slate-900` (WCAG AA)
- Labels: `text-slate-700` (WCAG AA)
- Placeholders: `text-slate-400` (acceptable for placeholder only)
- Primary buttons: `#7ac943` on white (4.5:1+)

---

## Success/Error States

### Success Message

```tsx
<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
    <CheckCircle className="h-6 w-6 text-emerald-600" />
  </div>
  <h2 className="text-lg font-semibold text-emerald-900">Success Title</h2>
  <p className="mt-2 text-sm text-emerald-700">Success message here.</p>
</div>
```

### Error Message

```tsx
{errorMessage ? (
  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
    {errorMessage}
  </p>
) : null}
```

### Inline Field Error

```tsx
<FormField label="Email" error={emailError}>
  <Input aria-invalid={emailError ? true : undefined} ... />
</FormField>
```

---

## Checklist for New Screens

When applying this design system to new screens:

- [ ] Use AuthLayout wrapper (or adapt layout pattern)
- [ ] Use FormField component for all inputs
- [ ] Use 48px input height (h-12)
- [ ] Use rounded-lg (8px) border radius
- [ ] Use slate color palette for neutrals
- [ ] Use #7ac943 for primary actions
- [ ] Include focus ring with transparency
- [ ] Use 8pt grid spacing (space-y-5 for forms)
- [ ] Center align text in cards
- [ ] Include top labels above inputs
- [ ] Add proper aria-invalid states
- [ ] Test touch target sizes (44px minimum)

---

## File Structure

```
components/auth/
├── auth-layout.tsx           # Main layout wrapper
├── hero-illustration.tsx     # Learning theme SVG
├── form-field.tsx            # Reusable field wrapper
├── password-input.tsx        # Password with toggle
├── login-page-client.tsx    # Login page (split-panel layout)
└── register-page-client.tsx # Registration page (multi-step wizard)
```

> **Removed (TASK-57):** `login-form.tsx`, `register-form.tsx`, `bento-auth-shell.tsx`, `bento-auth-field.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx` — all replaced by the `*-page-client.tsx` components above.

---

## Migration from Old Design

The old bento design components have been removed. The current auth pages use `login-page-client.tsx` and `register-page-client.tsx` directly.

Previous migration notes (for reference):

1. `BentoAuthShell` and `BentoAuthField` have been removed
2. `FormField` (from `form-field.tsx`) is still used by `password-input.tsx`
3. Input classes use the current design system (`Input` from `@/components/ui/input`)
4. Button classes use the current design system (`Button` from `@/components/ui/button`)
