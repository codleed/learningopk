# Summary Editor Baseline (Pre-CodeMirror 6)

## Capture Date

- UTC: 2026-03-03T19:59:33.413Z

## Command

- `pnpm.cmd --filter frontend test:e2e:perf:summary`

## Dataset and Method

- Route: `/admin/content` -> Chapter tab -> existing summary textarea editor.
- Selected first available chapter in summary editor dropdown.
- Loaded existing summary, then replaced content with ~15k character markdown body.
- Collected 60 synthetic input samples in page context and measured keypress-to-two-frames latency.

## Baseline Metrics

- Admin content route load (login + navigate + chapter tab ready): `3887ms`
- Chapter summary fetch-to-editor-ready: `286ms`
- Typing latency (60 samples on ~15k summary):
- p95: `122.6ms`
- mean: `91.59ms`
- max: `206.5ms`

## Artifact

- JSON: `docs/perf/admin-summary-editor-baseline.json`
