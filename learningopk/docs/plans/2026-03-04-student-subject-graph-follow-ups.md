# Student Subject Graph: Follow-up Improvements

1. Add explicit retry action in graph error state instead of requiring tab re-entry.
2. Add server-side pagination/chunking option for very large subject graphs (500+ nodes).
3. Add node clustering toggle for dense graphs to improve readability.
4. Add keyboard navigation for node list and focused-node highlight sync on canvas.
5. Add backend query timing instrumentation (p50/p95) for `/api/learn/:board/:grade/:subject/graph`.
6. Add visual legend for resolved vs unresolved links and completion statuses.
