# Illustration Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 5th "Illustration" tab to the student chapter study workspace that shows numerical (physics) exercises with a visualization-first layout.

**Architecture:** Client-side filtering splits exercises into two sets: non-numerical go to Training tab, numerical go to Illustration tab. New `QuestIllustrationView` component renders each numerical exercise as a hero card with `NumericalVisualizationRenderer` at top, question/solution below. No backend changes needed.

**Tech Stack:** Next.js 16, React, TypeScript, Framer Motion, Tailwind CSS, Lucide React icons, CVA, Zod

---

### Task 1: Update page.tsx — Add `illustration` to tabSchema + tabs array

**Files:**

- Modify: `frontend/app/(learn)/[board]/[grade]/[subject]/[chapter]/page.tsx:18,56-66`

**Changes:**

1. Line 18: Add `"illustration"` to the `z.enum()` in `tabSchema`
2. Lines 56-66: Add illustration tab entry to the `tabs` array (after quiz)

---

### Task 2: Update QuestTabBar — Add Illustration tab config, progress & completion

**Files:**

- Modify: `frontend/src/components/learn/quest-tab-bar.tsx:3,9,11-18,26-35,38-51,53-66`

**Changes:**

1. Line 3: Import `Atom` icon from lucide-react
2. Line 9: Add `"illustration"` to `ChapterTab` union type
3. Lines 11-18: Add `illustrations: number` and `totalIllustrations: number` to `TabStatus`
4. Lines 26-35: Add `{ key: "illustration", label: "Illustration", icon: Atom }` to `TAB_CONFIG`
5. Lines 38-51 (`getTabCompleted`): Add `case "illustration"` returning `status.totalIllustrations > 0 && status.illustrations >= status.totalIllustrations`
6. Lines 53-66 (`getTabProgress`): Add `case "illustration"` returning `status.totalIllustrations > 0 ? \`${status.illustrations}/${status.totalIllustrations}\` : null`

---

### Task 3: Update ChapterStudyWorkspace — Filter exercises, TAB_ICONS, TabStatus, completionPercent

**Files:**

- Modify: `frontend/src/components/learn/chapter-study-workspace.tsx:4,26,49-54,84-96,136-149,169-184`

**Changes:**

1. Line 4: Import `Atom` from lucide-react
2. Line 26: Add `"illustration"` to `ChapterTab` union type
3. Lines 49-54: Add `illustration: <Atom className="h-4 w-4" />` to `TAB_ICONS`
4. Inside component body: Add `useMemo` to split exercises:
   - `trainingExercises = exercises.filter(e => e.type !== "numerical")`
   - `illustrationExercises = exercises.filter(e => e.type === "numerical")`
5. Lines 88-96: Change `parts = 4` to `parts = 5`, add illustration completion check
6. Lines 141-148: Add `illustrations` and `totalIllustrations` to QuestTabBar `status` prop
7. Pass `trainingExercises` to `ChapterStudyContentWithAi` (exercises prop), and add `illustrationExercises` prop

---

### Task 4: Create QuestIllustrationView component

**Files:**

- Create: `frontend/src/components/learn/quest-illustration-view.tsx`

**Design:**

- Visualization-first card layout
- Progress header with completion tracking (same pattern as QuestExercisesView)
- Per-exercise hero card: NumericalVisualizationRenderer at top, then exercise number + difficulty badge + question via ContentRenderer, then expandable solution
- Staggered entrance animation (delay: `index * 0.04`, max 0.4s)
- Empty state when no numerical exercises
- "No visualization" indicator when exercise lacks visualizationHtml

---

### Task 5: Update ChapterStudyContentWithAi — Route illustration tab

**Files:**

- Modify: `frontend/src/components/learn/chapter-study-content-with-ai.tsx:1-77`

**Changes:**

1. Import `QuestIllustrationView`
2. Add `ChapterTab` to include `"illustration"`
3. Add `illustrationExercises` prop to the props type
4. Add `completedIds` and `onMarkComplete` props (for gamification)
5. Add rendering block for `activeTab === "illustration"` that renders `QuestIllustrationView`

---

### Task 6: Verify, typecheck, lint, commit

**Commands:**

```bash
pnpm typecheck   # from learningopk/
pnpm lint         # from learningopk/
```

Then commit and push to PR #27.
