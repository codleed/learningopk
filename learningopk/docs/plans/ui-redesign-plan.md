# LearningoPK UI/UX Redesign — Build-from-Scratch Plan

## 1. Objective

Completely redesign the LearningoPK frontend UI and UX without rebuilding backend/domain behavior. The result should feel like a deliberate Pakistani board-exam learning product—not a generic SaaS dashboard or an AI-generated template.

The redesign will use a light-green and light-blue visual system, improve the learner’s daily study loop, clarify information architecture, and preserve existing REST/API contracts, authentication, KaTeX rendering, quizzes, past papers, AI tutor, forum, teacher, and admin capabilities.

**Primary audience:** Pakistani Grade 9–10 students preparing for FBISE, Punjab, and Sindh board exams.

**Primary product job:** Help a student immediately understand what to study next, complete it, and see meaningful progress toward board readiness.

## 2. Current product constraints discovered

- Stack: Next.js 16.2.3, React 19, Tailwind 4, Framer Motion, Radix UI, Lucide, KaTeX, React Markdown, Playwright.
- Existing design tokens are in `learningopk/frontend/src/design-system/tokens.css`; global composition is in `learningopk/frontend/app/globals.css`.
- Existing shell is `learningopk/frontend/src/components/foundation/app-shell.tsx` plus `left-rail.tsx`, with responsive desktop rail and mobile bottom navigation.
- Dashboard data is server-loaded in `learningopk/frontend/app/(dashboard)/dashboard/page.tsx`, with parallel API calls and existing fallbacks that should remain intact.
- Public landing page is composed in `learningopk/frontend/app/page.tsx` and `_landing/*` components.
- The frontend has a large route surface: auth, learner dashboard, subjects/chapters, review, formulas, notes, stats, leaderboard, past papers, AI tutor, forum, classroom, teacher, school, and admin content/analytics/moderation flows.
- Existing assets are sparse and mostly subject SVGs plus `new_logo.png`; the redesign should not depend on an unplanned illustration/stock-photo library.
- Existing `Fraunces + Geist + JetBrains Mono` typography and green tokens are a starting point, not a requirement. Keep only what survives the visual critique.

## 3. Mobbin research synthesis

Mobbin’s public pages are JavaScript-heavy, so the research is pattern-level rather than a copy of inaccessible individual screens. Sources:

- [Mobbin](https://mobbin.com/)
- [Mobbin Web Apps](https://mobbin.com/browse/web/apps)

Patterns worth borrowing:

1. **Progressive disclosure:** separate onboarding, study, assessment, and review journeys; do not expose every feature on the learner’s first screen.
2. **Persistent navigation:** keep high-frequency destinations visible in a stable desktop sidebar and compact mobile navigation.
3. **Progress as an interaction:** pair completion/progress with the next action, not percentages alone.
4. **Grouped scan-friendly content:** use purposeful sections for today’s study, pending work, recent activity, and resources.
5. **Action-oriented states:** empty, loading, success, and error states should tell students what to do next.
6. **Context tabs and filters:** use them for subjects, active/completed work, and learner/teacher context; avoid analytics-style filter overload.
7. **Contextual reference actions:** saving, notes, and comments should attach to learning material rather than becoming generalized social clutter.
8. **Interaction continuity:** onboarding, lesson completion, quiz submission, and result review must use consistent state transitions and feedback.

Do not imitate Mobbin screenshots or produce a collage of familiar SaaS patterns. Use the patterns as UX evidence, then express them through LearningoPK’s subject matter: board syllabi, chapter maps, exam timing, Urdu/English content, formulas, and practice results.

## 4. Recommended visual direction: “Study Field Notes”

### Design thesis

LearningoPK should feel like a beautifully organized exam notebook translated into a calm digital workspace: clear green study signals, blue reasoning/reference surfaces, and visible chapter structure. The product should feel useful within five seconds, not ornamental.

### Palette

Use named tokens rather than scattered hex values:

- **Paper:** `#F7FBF8` — default canvas, slightly green rather than sterile white.
- **Ink:** `#15352D` — primary text and high-contrast headings.
- **Leaf:** `#287A5A` — primary action, completed state, active navigation.
- **Mint wash:** `#DDF3E8` — selected/positive surfaces and progress backgrounds.
- **Sky:** `#4E91B8` — information, explanation, references, AI tutor context.
- **Blue wash:** `#E4F2F8` — study guidance, formulas, hints, non-destructive callouts.
- **Line:** `#D5E5DD` — quiet borders and notebook rules.
- **Warm signal:** a restrained amber only for deadlines/attention; never introduce a rainbow palette.

Use light mode as the product default. If dark mode remains supported, derive a deliberate dark “night study” theme from these semantic roles; do not merely invert the light palette.

### Typography

- Keep a distinctive display face only for page titles and major learning statements; evaluate whether the existing Fraunces remains appropriate after screenshots.
- Use a highly legible sans for navigation, controls, tables, and dense study UI.
- Use a mono face only for formula/code-like content, timers, and numeric study data.
- Define a small, explicit type scale and line-height system. Avoid oversized marketing headings inside the app.

### Shape, layout, and texture

- Use medium, consistent radii; avoid pill-shaped everything and avoid floating glassmorphism.
- Use one strong signature element: a **chapter-path rail** that visually connects “now,” “next,” and “review” across the dashboard and subject workspace. It should be structural, not decorative.
- Prefer quiet paper-like surfaces, thin rules, selective green/blue blocks, and precise spacing over gradients, shadows, blobs, or decorative illustration.
- Cards should be used for bounded tasks, not every paragraph. Some content should sit directly on the canvas with section hierarchy.
- Use a responsive content frame with generous desktop margins and a focused single-column mobile reading experience.

### Motion

- One orchestrated entrance for major pages, then restrained transitions.
- Use motion to explain state: path progression, quiz answer confirmation, saved note, completed chapter, drawer open/close.
- Respect `prefers-reduced-motion`; no perpetual decorative animation, confetti by default, or parallax backgrounds.

## 5. Information architecture and UX changes

### Learner navigation

Desktop primary destinations:

- Today
- Subjects
- Practice
- AI Tutor
- Community

Secondary destinations:

- Review queue
- Notes and formulas
- Progress
- Leaderboard
- Settings

Keep teacher/admin/school surfaces role-specific and visually related, but do not let their dense management navigation leak into the student experience.

Mobile: use four high-frequency destinations plus a clearly labeled More sheet. Preserve deep links and active-route semantics.

### Dashboard: “Today”

Replace the generic widget wall with a clear decision surface:

1. Greeting plus current board/class context.
2. One primary “Continue studying” action with the subject, chapter, estimated time, and reason it is recommended.
3. Chapter-path rail showing completed, current, and next milestones.
4. Compact study queue: review due, unfinished practice, upcoming classroom work.
5. Subject readiness overview using meaningful labels such as “starting,” “in progress,” and “ready to revise.”
6. Recent wins/activity only when it helps the next decision.
7. AI tutor entry as a contextual helper, not a competing hero.

### Subjects and learning workspace

- Browse by board, grade, and subject with strong context breadcrumbs.
- Make the chapter map the central object, with weight/importance and progress visible.
- Keep learning content readable: reduce chrome around explanations, formulas, examples, and exercises.
- Use sticky contextual actions only when they improve completion: Continue, save note, ask tutor, mark for review.
- Preserve KaTeX, markdown, bilingual content, and chapter/exercise routing.

### Practice and assessment

- Unify MCQ, short, long, fill-in-the-blank, physics, and past-paper entry points under Practice while retaining each flow’s semantics.
- Make mode, time, question count, and expected outcome clear before starting.
- During a quiz/paper, prioritize focus: timer, question progress, answer state, navigation, and save/submit.
- Results must answer: what happened, why, what to revise, and what to do next.

### AI tutor

- Position the tutor as a study companion tied to the current subject/chapter/question.
- Make context visible and editable without exposing implementation details.
- Distinguish explanation, hint, and answer-reveal actions.
- Keep crisis/safety states, streaming states, retry states, and empty states intentional and accessible.

### Community, teacher, and admin

- Forum: improve scan hierarchy, topic context, moderation cues, and reply composition; do not turn it into a social feed.
- Classroom: show assignments, deadlines, feedback, and announcements as pedagogical work.
- Admin: optimize dense CRUD tables/forms for speed and clarity, not marketing aesthetics.
- Document the deliberate boundary: JS Classroom remains pedagogical grouping; Frappe Student Group/Program remains official administrative enrollment/billing/timetable.

## 6. Build-from-scratch execution phases

### Phase 0 — UX inventory and baselines

- Capture current screenshots and route recordings for representative public, learner, practice, AI, forum, teacher, and admin screens.
- Create a route/state matrix covering loading, empty, error, success, permission-denied, mobile, keyboard, and reduced-motion states.
- Record API/data dependencies for each screen; explicitly mark what must not change.
- Establish visual acceptance pages: landing, login, dashboard, subject/chapter, quiz, results, AI tutor, forum, teacher classroom, and admin table/form.

### Phase 1 — Design foundation

- Replace/reshape `tokens.css` into semantic Paper/Ink/Leaf/Mint/Sky/Blue roles with light and night-study variants.
- Define typography, spacing, radii, borders, focus rings, shadows, breakpoints, motion, and z-index tokens.
- Build/standardize primitives: Button, IconButton, Link, Badge, Progress, Tabs, Breadcrumbs, Surface, SectionHeader, EmptyState, ErrorState, Skeleton, Dialog/Drawer, Toast, DataTable, FormField, and StatusIndicator.
- Add a small icon rule set: icons support labels; no icon-only ambiguity; no decorative icon noise.
- Document usage rules and anti-patterns in a frontend design-system file near the tokens.

### Phase 2 — Shell and public experience

- Rebuild app shell, desktop navigation, mobile navigation, profile/settings access, role switching, skip links, and page containers.
- Rebuild landing page around a single product thesis and a real study-flow preview, not generic feature cards.
- Rebuild login/register/verification layouts as calm, task-focused entry points.
- Validate responsive and accessibility behavior before porting every route.

### Phase 3 — Core learner journey

Implement in this order so the product becomes usable early:

1. Today/dashboard.
2. Subjects and chapter map.
3. Chapter study workspace.
4. Practice selection and quiz runner.
5. Results/review recommendations.
6. Review queue, notes, and formulas.
7. AI tutor contextual surfaces.
8. Past papers and solutions.
9. Stats, streaks, leaderboard, and classroom surfaces.

Refactor shared visual behavior rather than duplicating screen-specific styles.

### Phase 4 — Community, teacher, and admin

- Apply the same design language to forum and study groups without flattening their distinct workflows.
- Rebuild teacher classroom and assignment views around deadlines and feedback.
- Rebuild admin information architecture with dense, efficient tables/forms and clear destructive-action safeguards.
- Keep all role permissions and API behavior unchanged.

### Phase 5 — Quality and polish

- Run typecheck, lint, unit tests, and Playwright smoke tests after each route family.
- Add visual regression screenshots for the acceptance pages at desktop, tablet, and mobile widths.
- Test keyboard-only navigation, focus visibility, contrast, reduced motion, screen-reader labels, touch targets, and RTL/bilingual text rendering.
- Test slow API, empty data, failed API, expired session, unauthorized route, and long-content states.
- Remove unused legacy styles/tokens/components only after route migration and screenshot comparison.
- Perform a final “AI slop” critique: remove redundant rounded cards, arbitrary gradients, generic dashboard metrics, decorative animation, vague copy, and inconsistent button labels.

## 7. Reusable implementation prompt

> Redesign the LearningoPK frontend from scratch as a production educational product for Pakistani Grade 9–10 board-exam students. Preserve all existing API contracts, authentication, route behavior, permissions, KaTeX/markdown rendering, quiz/past-paper semantics, AI tutor streaming, forum, classroom, and admin capabilities. Do not rebuild backend logic.
>
> Use the “Study Field Notes” direction: a calm paper-like light canvas, light green progress/action language, light blue explanation/reference language, dark ink text, thin notebook-like rules, restrained shadows, and one structural chapter-path rail connecting now/next/review. Use semantic design tokens, not scattered colors. Keep typography deliberate and readable; use display typography sparingly and never make the app look like a template.
>
> Start by creating a route/state inventory and a compact design system. Then rebuild the shell, public/auth flows, Today dashboard, subjects/chapter workspace, practice/quiz/results loop, AI tutor, forum, teacher, and admin surfaces in vertical slices. Every screen must have designed loading, empty, error, success, permission, mobile, keyboard, reduced-motion, and long-content states. Use progressive disclosure and action-oriented progress inspired by Mobbin’s web-app patterns, but do not copy screenshots or reproduce generic SaaS dashboards.
>
> The dashboard must answer “What should I study now?” within five seconds. Results must answer “What happened, why, and what next?” The AI tutor must clearly distinguish explanation, hint, and answer reveal. Practice flows must protect focus. Admin screens must optimize operations rather than marketing polish.
>
> Avoid AI-slop signals: no rainbow gradients, glassmorphism, excessive pills, identical rounded cards, giant meaningless hero statistics, decorative blobs, stock illustrations, perpetual animation, vague marketing copy, or unlabelled icon controls. Every visual choice must support comprehension, orientation, or completion. Use real product content such as board, grade, subject, chapter, exam timing, formulas, and revision recommendations.
>
> Before considering the work complete, run typecheck/lint/tests and Playwright visual smoke coverage. Review screenshots at desktop/mobile widths, verify keyboard and reduced-motion behavior, compare against the route/state matrix, and remove one unnecessary decorative element from every major screen.

## 8. Acceptance criteria

- A student can identify their next study action from Today without scanning a widget wall.
- Public, auth, learner, practice, AI, community, teacher, and admin screens share one coherent visual system while retaining role-appropriate density.
- Light green and light blue are clearly present as semantic roles, with readable contrast and no color-only meaning.
- Existing APIs, auth, route contracts, data semantics, math rendering, streaming, and permissions remain functional.
- Every core flow has loading, empty, error, success, and permission states.
- Desktop, tablet, and mobile layouts are intentionally designed rather than merely stacked.
- Keyboard focus, reduced motion, touch targets, contrast, and bilingual/RTL content are tested.
- Playwright smoke tests and frontend typecheck/lint pass.
- Visual review finds no generic template signals or unexplained decoration.
- The final diff is organized by design-system primitives and vertical route slices, with no speculative backend changes.

## 9. Suggested validation commands

```bash
cd learningopk
npm --workspace frontend run typecheck
npm --workspace frontend run lint
npm --workspace frontend run test:e2e:smoke
npm --workspace frontend run build
```

Add a documented screenshot/visual-regression command once the chosen Playwright baseline strategy is implemented.

## 10. Important implementation boundary

This document is the design/build plan only. It does not authorize implementation yet. After approval, work should begin with Phase 0 inventory and Phase 1 tokens/primitives, then proceed through the learner journey before broad role-surface migration.

## References

- Mobbin: https://mobbin.com/
- Mobbin Web Apps: https://mobbin.com/browse/web/apps
- Current frontend tokens: `learningopk/frontend/src/design-system/tokens.css`
- Current global styles: `learningopk/frontend/app/globals.css`
- Current shell: `learningopk/frontend/src/components/foundation/left-rail.tsx`
- Current dashboard route: `learningopk/frontend/app/(dashboard)/dashboard/page.tsx`
- Current public route: `learningopk/frontend/app/page.tsx`
- Frontend dependencies/scripts: `learningopk/frontend/package.json`
