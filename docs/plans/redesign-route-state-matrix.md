# LearningoPK Redesign — Phase 0 Baseline: Route/State Matrix

Companion to `shang-chi-nebula-hulkling.md` ("Study Field Notes" redesign). This is the inventory of what exists, what each screen depends on, and what must not change.

## Hard invariants (must not change)

- All REST API contracts and fetch paths (`frontend/src/lib/*-api.ts`, `API_INTEGRATION_NOTES.md`).
- Authentication/session flow (`getServerSession`, Better Auth, `proxy.ts` middleware).
- Route URLs and params (`[board]/[grade]/[subject]/[chapter]`, past-paper ids, admin CRUD paths).
- Role permissions and guards (`AdminGuard`, teacher role checks, `auth-layout-wrapper` view modes).
- KaTeX + markdown rendering pipeline (`MarkdownRenderer.tsx`, `VirtualizedMarkdown.tsx`, `markdown.css`, `katex.min.css` import).
- Quiz/past-paper semantics: `a/b/c/d` option shape, `fill_in_blanks` blanks, timers, submission payloads, streaming AI tutor responses.
- Backend: no changes at all.

## Route inventory by slice

### Public
| Route | File | Data deps | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` + `app/_landing/*` | none (static) | Rebuild around single product thesis + real study-flow preview |
| `/login` `/register` `/verify-email` | `app/(auth)/*` | auth endpoints | Calm, task-focused entry; uses `components/auth/auth-layout.tsx` |

### Learner core (mounted via `AppShell` per page)
| Route | File | Data deps |
|---|---|---|
| `/dashboard` ("Today") | `app/(dashboard)/dashboard/page.tsx` → `DashboardClient` + 14 widgets | dashboard summary, learning path, study groups, subjects, school, subject overviews |
| `/dashboard/groups[/*]` | `(dashboard)/dashboard/groups/*` | study-groups API |
| `/dashboard/[boardSlug]/[grade]/[subjectSlug]` | `(dashboard)/dashboard/[boardSlug]...` | learn API |
| `/subjects` | `(dashboard)/subjects/page.tsx` | learn API |
| `/calendar` | `(dashboard)/calendar/page.tsx` | — |
| `/stats` | `(dashboard)/stats/page.tsx` (client mounts AppShell) | stats API, echarts |
| `/settings` | `(dashboard)/settings/page.tsx` | profile/session |
| `/review` | `(dashboard)/review/page.tsx` | review queue API |
| `/formulas` | `(dashboard)/formulas/page.tsx` | formulas API (starred) |
| `/leaderboard` | `(dashboard)/leaderboard/page.tsx` (client mounts AppShell) | leaderboard API |
| `/notes` | `(dashboard)/notes/page.tsx` | notes API |
| `/student/my-classroom` | `(dashboard)/student/my-classroom/page.tsx` | teacher/classroom API |

### Learning workspace (`(learn)`)
| Route | File | Data deps |
|---|---|---|
| `/[board]/[grade]/[subject]` | `app/(learn)/[board]/[grade]/[subject]/page.tsx` | subject overview, chapter map |
| `/[board]/[grade]/[subject]/[chapter]` | `.../[chapter]/page.tsx` | summary, exercises, flashcards, quiz — quest tabs |
| `/patterns/[board]/[subject]` | `app/(learn)/patterns/...` | exam analysis |
| `/past-papers` + `[id]/view|solutions|attempt|attempts/[attemptId]` | `app/(learn)/past-papers/*` | mockExams API |

### AI / community / roles
| Route | File | Data deps |
|---|---|---|
| `/ai-tutor` | `app/ai-tutor/page.tsx` + `components/ai/ai-unified-chat/*` | streaming AI chat API |
| `/forum` `/forum/[threadId]` | `app/forum/*` | forum API |
| `/school` | `app/school/*` (layout mounts AppShell) | school API |
| `/teacher` `/teacher/[classroomId]` | `app/(dashboard)/teacher/*` | teacher API (own classrooms only) |
| `/admin/**` (~40 pages) | `app/admin/**` (layout: AdminGuard → AppShell) | admin APIs; dense CRUD tables/forms |

### Legacy redirects (no UI)
- `/subjects/[subject]` and `/subjects/[subject]/[chapter]` — server-side `redirect()` to `(learn)` routes.

## State matrix (every redesigned screen needs each state designed)

1. **Loading** — skeleton matching final layout (no spinners-only for full pages).
2. **Empty** — action-oriented: what to do next (e.g., "Pick a subject to start").
3. **Error** — `ErrorState` with retry (`router.refresh()` pattern) + what the student can still do.
4. **Success/completion** — paired with the next action, not percentages alone.
5. **Permission-denied** — role-appropriate explanation + route back.
6. **Mobile** — single-column reading; bottom tab bar (4 destinations + More sheet).
7. **Keyboard** — visible focus rings, skip link, logical tab order.
8. **Reduced motion** — no entrance/stagger animation; instant state changes.
9. **Long content** — bilingual Urdu/English strings, long chapter titles, KaTeX blocks.
10. **Slow/failed API, expired session** — existing fallbacks in data loading must stay intact.

## Visual acceptance pages (screenshot review targets)

landing, login, dashboard (Today), subject overview, chapter workspace, quiz runner, results, AI tutor, forum thread, teacher classroom, admin table, admin form — each at desktop (1440), tablet (768), mobile (390).

## Screenshot/recording baseline status

Live screenshots require Postgres + Redis + backend + seeded data (`npm run docker:up`, `db:migrate`, `db:seed`). Baseline capture is deferred to Phase 5 verification runs; the matrix above is the static baseline. If services are unavailable in this environment, verification falls back to typecheck/lint/build + code review against this matrix, and the gap is reported explicitly.

## What must not change (data/API) per screen family

- Dashboard: `Promise.allSettled` two-phase fetch + fallbacks in `app/(dashboard)/dashboard/page.tsx` stay intact; only presentation components change.
- Chapter workspace: quest tab semantics (summary/exercises/flashcards/quiz), exercise renderers, `fill_in_blanks` handling, KaTeX.
- Quiz/past papers: timer, question navigator, answer state, submission payloads.
- AI tutor: streaming path, context drawer, crisis/safety states; only visual language and action labels (explain/hint/reveal) change.
- Forum: solved/unsolved filter semantics, voting, UUID identifiers.
- Admin: all CRUD operations, audit log behavior, role checks.
