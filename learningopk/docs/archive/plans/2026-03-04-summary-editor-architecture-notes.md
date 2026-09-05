# Summary Editor Architecture Notes

## Decisions

- Chose CodeMirror 6 instead of embedding Obsidian runtime.
- Added persistent chapter link index in backend (`chapter_summary_links`, `chapter_title_aliases`) to make backlinks and graph reliable.
- Added chapter graph endpoint in admin API (`/api/admin/content/chapters/graph`) as a dedicated read model.
- Used `react-force-graph-2d` for interactive pan/zoom/select graph rendering in admin summary workspace.
- Kept markdown rendering path unchanged (`MarkdownMathRenderer`) for learner/admin preview compatibility.

## Performance Tradeoffs

- Dynamic editor content sync to React state is debounced to reduce parent rerenders.
- Kept graph data fetch batched and filtered client-side for fast local search interactions.
- Loaded graph component in client context to avoid SSR overhead.
- Reduced CodeMirror extensions to prioritize typing throughput over editor chrome.

## Reliability Tradeoffs

- Link resolution prefers same-subject chapter when multiple title matches exist.
- Rename propagation is handled through alias persistence and link refresh.
- Unresolved links remain explicit in UI rather than auto-creating chapters.
