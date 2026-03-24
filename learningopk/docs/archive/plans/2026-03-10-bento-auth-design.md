# Bento Auth Screens Design

**Date:** 2026-03-10

## Goal

Redesign the `/login` and `/register` screens to match the provided Bento-style references while preserving the existing authentication behavior, validation rules, and route boundaries.

## Scope

- Replace the current shared dashboard-style auth layout on `/login` and `/register` with a standalone auth shell.
- Keep `/forgot-password` and `/reset-password` on the current layout.
- Preserve the real field set and validation already implemented in each form.
- Preserve the existing auth client calls and post-auth redirects.

## Visual Direction

The new auth pages use a warm, low-contrast neutral background with a simple top bar, a centered rounded card, and a light footer beneath the card. The card should feel isolated from the rest of the app rather than embedded in the dashboard shell.

Shared visual elements for both pages:

- Thin top divider below the header row
- Brand mark at top-left with Bento-style wordmark treatment
- Minimal top-right auth link
- Large white card with extra-large corner radius
- Soft border treatment rather than strong shadows
- Warm orange primary action button
- Slate/navy heading color and muted supporting text
- Compact footer text centered beneath the card

## Layout

### Shared shell

Create a login/register-only shell that:

- Fills the viewport with the warm neutral page background
- Centers a constrained auth card vertically with comfortable mobile spacing
- Keeps the header and footer outside the card
- Does not use `AppShell`, `PageHeader`, or `SectionCard`

### Login page

The login card should include:

- Circular lock badge above the heading
- `Welcome Back` heading and short subtitle
- Email field
- Password field with visibility toggle
- Remember-me checkbox
- Forgot-password link aligned with the password label/row
- Full-width `Log In` button
- Divider with `Or continue with`
- Two visual social buttons
- Bottom prompt linking to account creation

### Register page

The register card should include:

- `Create your student account` heading and subtitle
- Existing real registration fields in the current order:
  - `name`
  - `class`
  - `degree`
  - `board`
  - `email`
  - `password`
  - `confirmPassword`
- Two-column layout where it matches the reference and still works responsively
- Terms text row with checkbox treatment
- Full-width `Create account` button
- Bottom prompt linking to sign-in

## Behavior

### Login

- Keep the current `zod` validation and `authClient.signIn.email` call
- Keep redirect to `/dashboard` on success
- Keep inline error display behavior
- The remember-me control is presentation-only unless auth support already exists
- Social buttons are presentation-only unless provider auth is already wired

### Register

- Keep the current `zod` validation and `authClient.signUp.email` call
- Keep the async board/class loading behavior from the backend
- Keep redirect to `/dashboard` on success
- Keep inline error display behavior
- Preserve the existing dependency where class options depend on the selected board
- The terms checkbox is presentational unless the current registration logic already enforces consent

## Accessibility

- Preserve explicit labels for all form controls
- Keep buttons, links, select controls, and password toggles keyboard-accessible
- Mark decorative icons as hidden from assistive technologies
- Maintain visible focus states on all interactive elements
- Keep the layout readable and usable on mobile widths

## Implementation Notes

- Use login/register-specific components or wrappers instead of changing shared UI primitives globally
- Prefer shared Bento auth building blocks only where both pages actually use them
- Avoid modifying the visual behavior of other auth routes or dashboard pages

## Testing

- Add focused tests before implementation for the new standalone page structure and key UI affordances
- Reuse existing Playwright auth coverage where possible instead of creating broad new end-to-end flows
- Run frontend lint and typecheck after implementation
