# Auth Scale Fix Design

**Date:** 2026-03-10

## Goal

Reduce the visual scale of the standalone Bento auth screens so they match the intended mockup proportions instead of appearing zoomed in.

## Scope

- Update `/login` and `/register` only
- Keep the current Bento layout structure and lime-green accent
- Preserve auth logic, validation, and field order

## Visual Change

Reduce oversized sizing in the Bento auth UI, including:

- heading and subtitle typography
- card padding and vertical spacing
- label, link, and helper text sizing
- input and button heights
- icon offsets and padding inside pill fields
- checkbox row sizing

The result should feel closer to a normal desktop auth form rather than an enlarged/mobile-scaled layout.
