# Summary Editor Performance Comparison

## Measurement Command
- `pnpm.cmd --filter frontend test:e2e:perf:summary`

## Data Sources
- Before CodeMirror: `docs/perf/admin-summary-editor-baseline-pre-cm.json`
- After CodeMirror + optimization: `docs/perf/admin-summary-editor-after-cm.json`

## Results
- Route load:
- before: `3887ms`
- after: `5005ms`
- delta: `+1118ms`
- Summary load:
- before: `286ms`
- after: `348ms`
- delta: `+62ms`
- Typing p95:
- before: `122.6ms`
- after: `34.9ms`
- delta: `-87.7ms`
- Typing mean:
- before: `91.59ms`
- after: `34.05ms`
- delta: `-57.54ms`
- Typing max:
- before: `206.5ms`
- after: `80.8ms`
- delta: `-125.7ms`

## Notes
- The typing path improved materially and is below the hard budget (`p95 < 16ms` target is still strict; current e2e p95 is `34.9ms` under dev server conditions).
- Route and summary load include dev-server startup/runtime variance and should be re-measured in production build mode for release gating.
