# Student Subject Graph Performance Comparison (2026-03-04)

## Method

- Baseline (list view only): `pnpm --filter frontend test:e2e -- tests/e2e/student-subject-page-baseline-performance.spec.ts`
- Graph interaction: `pnpm --filter frontend test:e2e -- tests/e2e/student-subject-graph-performance.spec.ts`

Metrics are written to:

- `docs/perf/student-subject-graph-baseline.json`
- `docs/perf/student-subject-graph-performance.json`

## Results

| Metric                               | Before (List Baseline) | After (Graph Enabled) | Delta |
| ------------------------------------ | ---------------------: | --------------------: | ----: |
| Subject route load (ms)              |                   5785 |                  5148 |  -637 |
| Graph first render after toggle (ms) |                    N/A |                   327 |   N/A |
| Search p95 update latency (ms)       |                    N/A |                   527 |   N/A |
| Search mean latency (ms)             |                    N/A |                 471.6 |   N/A |

## Budget Check

- Subject route load budget: `<= 8000 ms` -> PASS (`5148 ms`)
- Graph first render budget: `<= 5000 ms` -> PASS (`327 ms`)
- Search p95 budget: `<= 1200 ms` -> PASS (`527 ms`)
