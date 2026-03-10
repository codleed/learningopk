# Auth Scale Fix 2 Design

**Date:** 2026-03-10

## Goal

Reduce the visual scale of the standalone Bento auth screens further so they read as standard desktop-sized forms at 100% zoom.

## Scope

- Update `/login` and `/register` only
- Keep layout structure, spacing rhythm, and lime-green accent
- Preserve auth logic, validation, and field order

## Visual Change

Reduce sizing one more step:

- Inputs and buttons to ~44px height
- Body/label text to `text-sm` baseline
- Smaller heading and subtitle
- Tighter card padding and vertical spacing
- Smaller inline icons and badge

This should remove the “zoomed in” feel while retaining the Bento-style look.
