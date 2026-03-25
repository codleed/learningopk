# Content Management Navigation Redesign - UX Architecture Specification

## Executive Summary

Replace the **Entity Tree navigation** (Board → Class → Subject → Chapter hierarchy) with a **flat, tab-based content type navigation** that provides immediate visibility into all content types and their counts. Add missing screens for Exercise, Quiz, and Flash Card management.

---

## 1. Problem Analysis

### Current Issues with Entity Tree

1. **Deep nesting**: Users must expand Board → Class → Subject → Chapter (4 clicks minimum) just to reach content
2. **No direct access to leaf content**: Exercises, Quizzes, and Flash Cards are not visible in the tree at all
3. **Hidden actions**: Edit buttons are buried behind multiple clicks
4. **Poor scanability**: Users can't see all content at once - they must navigate hierarchically
5. **Context switching is slow**: Moving from editing a Board to editing a Chapter requires navigating back up and down the tree

### Entity Hierarchy (for reference)
```
Board
└── Class
    └── Subject
        └── Chapter
            ├── Exercise
            ├── Quiz
            └── Flash Card Deck
```

---

## 2. New Navigation Design

### Design Decision: Tab-Based Content Type Navigation

**Rationale:**
- Flattens the hierarchy for faster content discovery
- Consistent pattern across all content types (Boards, Classes, Subjects, Chapters, Exercises, Quizzes, Flash Cards)
- Edit actions visible immediately on each row
- 1-2 clicks to reach any content's edit screen
- Natural extension point for future content types

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Theme Toggle]                                     [User] [Logout]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CONTENT MANAGEMENT                                         │   │
│  │  Manage all educational content                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Boards] [Classes] [Subjects] [Chapters] [Exercises]       │   │
│  │  [Quizzes] [Flash Cards]                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  BOARDS                                          [+ Add]     │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Name          │ Classes │ Subjects │ Chapters │ Actions    │   │
│  ├────────────────┼─────────┼──────────┼──────────┼────────── ┤   │
│  │  Punjab Board  │    3    │    12    │   45     │ [Edit]     │   │
│  │  Federal Board │    2    │    8     │   30     │ [Edit]     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab Specifications

| Tab | Route | Icon | Shows |
|-----|-------|------|-------|
| Boards | `/admin/content/boards` | BookOpen | All boards with class/subject/chapter counts |
| Classes | `/admin/content/classes` | GraduationCap | All classes with subject/chapter counts |
| Subjects | `/admin/content/subjects` | Book | All subjects with chapter counts |
| Chapters | `/admin/content/chapters` | FileText | All chapters with exercise/quiz/flashcard counts |
| Exercises | `/admin/content/exercises` | Brain | All exercises across all chapters |
| Quizzes | `/admin/content/quizzes` | ClipboardList | All quizzes with question counts |
| Flash Cards | `/admin/content/flashcards` | Layers | All flash card decks with card counts |

### Default State
- **Boards tab active by default** when entering Content Management
- **URL reflects active tab**: `/admin/content/boards`, `/admin/content/exercises`, etc.
- **Tab state preserved** in URL for bookmarkability and refresh resilience

---

## 3. New Screen Inventory

### 3.1 Content Dashboard (Main Entry Point)

**Route**: `/admin/content`

**Purpose**: Main hub showing content overview with tabs for each content type.

**Components**:
- Page header with title "Content Management"
- Stats strip showing total counts for each content type
- Tab navigation for content types
- Active tab's content table
- Quick action buttons per content type

### 3.2 Exercise Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Exercise List | `/admin/content/exercises` | Table of all exercises with chapter, difficulty, type, Edit action |
| Add Exercise | `/admin/content/exercises/add?chapterId=X` | Create exercise under specific chapter |
| Edit Exercise | `/admin/content/exercises/[id]/edit` | Edit exercise metadata + question/solution |

**Exercise Table Columns**:
- Exercise # (e.g., "Exercise 3.2")
- Chapter (breadCrumb format: "Board / Class / Subject / Chapter")
- Type (MCQ, Short Answer, Long Answer, Numerical)
- Difficulty (Easy, Medium, Hard - color coded)
- Actions [Edit] [Delete]

**Add/Edit Exercise Form Fields**:
- Chapter (select dropdown - shows hierarchy path)
- Exercise Number (auto-suggest next available)
- Type (select: MCQ, Short Answer, Long Answer, Numerical)
- Difficulty (select: Easy, Medium, Hard)
- Question (markdown editor)
- Solution (markdown editor)
- [Save] [Cancel]

### 3.3 Quiz Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Quiz List | `/admin/content/quizzes` | Table of all quizzes |
| Add Quiz | `/admin/content/quizzes/add?chapterId=X` | Create quiz with questions |
| Edit Quiz | `/admin/content/quizzes/[id]/edit` | Edit quiz metadata + questions |

**Quiz Table Columns**:
- Quiz Title
- Chapter (breadcrumb)
- Type (Chapter Quiz, Mock Exam)
- Duration (minutes)
- Questions Count
- Total Marks
- Actions [Edit] [Delete]

**Add/Edit Quiz Form Fields**:
- Chapter (select)
- Title
- Type (Chapter Quiz / Mock Exam)
- Duration (minutes)
- Questions (dynamic list):
  - Question text
  - Option A, B, C, D
  - Correct Answer (A/B/C/D)
  - Marks
  - [Add Question] [Remove Question]
- [Save Quiz] [Cancel]

### 3.4 Flash Card Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Flash Card List | `/admin/content/flashcards` | Table of all flash card decks |
| Add Flash Cards | `/admin/content/flashcards/add?chapterId=X` | Create deck with cards |
| Edit Flash Cards | `/admin/content/flashcards/[id]/edit` | Edit deck name + cards |

**Flash Card Table Columns**:
- Deck Title
- Chapter (breadcrumb)
- Card Count
- Actions [Edit] [Delete]

**Add/Edit Flash Card Form Fields**:
- Chapter (select)
- Deck Title
- Cards (dynamic list):
  - Front (text)
  - Back (text)
  - [Add Card] [Remove Card]
- [Save Deck] [Cancel]

---

## 4. ASCII Wireframes

### 4.1 Content Dashboard (Boards Tab - Default)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ☀️ Light 🌙 Dark                                                            [A] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  CONTENT MANAGEMENT                                                        │  │
│  │  Manage boards, classes, subjects, chapters, exercises, quizzes, and      │  │
│  │  flash cards                                                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ STATS ───────────────────────────────────────────────────────────────────┐  │
│  │  [📚 3 Boards]  [🎓 8 Classes]  [📖 24 Subjects]  [📄 156 Chapters]       │  │
│  │  [🧠 89 Exercises]  [📋 45 Quizzes]  [🃏 67 Flash Card Decks]            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ CONTENT TABS ────────────────────────────────────────────────────────────┐  │
│  │  [BOARDS]  [CLASSES]  [SUBJECTS]  [CHAPTERS]  [EXERCISES]  [QUIZZES]       │  │
│  │  [FLASHCARDS]                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ BOARDS ───────────────────────────────────────────────────────────── [+] ─┐  │
│  │                                                                             │  │
│  │  ┌────────────────────┬─────────┬───────────┬──────────┬─────────────────┐│  │
│  │  │ Name               │ Classes │ Subjects  │ Chapters │ Actions         ││  │
│  │  ├────────────────────┼─────────┼───────────┼──────────┼─────────────────┤│  │
│  │  │ 📚 Punjab Board    │    3    │    12     │    45    │ [✏️ Edit]       ││  │
│  │  │ 📚 Federal Board   │    2    │     8     │    30    │ [✏️ Edit]       ││  │
│  │  │ 📚 Sindh Board     │    3    │    10     │    35    │ [✏️ Edit]       ││  │
│  │  └────────────────────┴─────────┴───────────┴──────────┴─────────────────┘│  │
│  │                                                                             │  │
│  │  Showing 1-3 of 3 boards                                                    │  │
│  │  [◀ Prev] [Next ▶]                                                        │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Content Dashboard (Exercises Tab)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ☀️ Light 🌙 Dark                                                            [A] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  CONTENT MANAGEMENT                                                        │  │
│  │  Manage boards, classes, subjects, chapters, exercises, quizzes, and        │  │
│  │  flash cards                                                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ STATS ───────────────────────────────────────────────────────────────────┐  │
│  │  [📚 3 Boards]  [🎓 8 Classes]  [📖 24 Subjects]  [📄 156 Chapters]       │  │
│  │  [🧠 89 Exercises]  [📋 45 Quizzes]  [🃏 67 Flash Card Decks]            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ CONTENT TABS ────────────────────────────────────────────────────────────┐  │
│  │  [BOARDS]  [CLASSES]  [SUBJECTS]  [CHAPTERS]  [EXERCISES]  [QUIZZES]       │  │
│  │  [FLASHCARDS]                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ EXERCISES ────────────────────────────────────────────────────────── [+] ─┐  │
│  │                                                                             │  │
│  │  ┌────────────┬─────────────────────────────────┬────────┬──────────┬─────┐│  │
│  │  │ Exercise   │ Chapter                         │ Type   │ Difficulty│ Act ││  │
│  │  ├────────────┼─────────────────────────────────┼────────┼──────────┼─────┤│  │
│  │  │ Ex 3.1     │ PB / Matric / Math / Ch 3       │ MCQ    │ 🟢 Easy   │ [✏️] ││  │
│  │  │ Ex 3.2     │ PB / Matric / Math / Ch 3       │ Short  │ 🟡 Medium │ [✏️] ││  │
│  │  │ Ex 3.3     │ PB / Matric / Math / Ch 3       │ Long   │ 🔴 Hard   │ [✏️] ││  │
│  │  │ Ex 4.1     │ PB / Matric / Physics / Ch 4     │ Num    │ 🟢 Easy   │ [✏️] ││  │
│  │  └────────────┴─────────────────────────────────┴────────┴──────────┴─────┘│  │
│  │                                                                             │  │
│  │  Showing 1-10 of 89 exercises                                              │  │
│  │  [◀ Prev] [1] [2] [3] ... [9] [Next ▶]                                     │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Add Exercise Screen

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Exercises                                                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  ADD EXERCISE                                                              │  │
│  │  Create a new exercise under a chapter                                    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ FORM ─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  Chapter *                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │  │
│  │  │ Select a chapter...                                    [▼]         │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  │  "Punjab Board / Matric / Mathematics / Chapter 3: Algebra"               │  │
│  │                                                                             │  │
│  │  Exercise Number *                                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │  │
│  │  │ 3.4                                                                 │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  Type *                           Difficulty *                             │  │
│  │  ┌─────────────────────────┐       ┌─────────────────────────┐            │  │
│  │  │ Multiple Choice (MCQ) [▼]│       │ Medium            [▼]  │            │  │
│  │  └─────────────────────────┘       └─────────────────────────┘            │  │
│  │                                                                             │  │
│  │  Question *                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │  │
│  │  │                                                                     │   │  │
│  │  │                                                                     │   │  │
│  │  │                                                                     │   │  │
│  │  │                                                                     │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  │  [Edit] [Preview]                                                          │  │
│  │                                                                             │  │
│  │  Solution *                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │  │
│  │  │                                                                     │   │  │
│  │  │                                                                     │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  │  [Edit] [Preview]                                                          │  │
│  │                                                                             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                                │  │
│  │  │   Create Exercise │  │     Cancel      │                                │  │
│  │  └─────────────────┘  └─────────────────┘                                │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Edit Quiz Screen

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Quizzes                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  EDIT QUIZ                                                                 │  │
│  │  Algebra Mid-Term Assessment                                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─ FORM ─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  Chapter                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │  │
│  │  │ Punjab Board / Matric / Mathematics / Chapter 3: Algebra           │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  Title *                           Type *                                   │  │
│  │  ┌─────────────────────────────┐    ┌─────────────────────────────┐       │  │
│  │  │ Algebra Mid-Term Assessment │    │ Chapter Quiz          [▼]   │       │  │
│  │  └─────────────────────────────┘    └─────────────────────────────┘       │  │
│  │                                                                             │  │
│  │  Duration (minutes) *                                                         │  │
│  │  ┌─────────────────────────────┐                                            │  │
│  │  │ 30                         │                                            │  │
│  │  └─────────────────────────────┘                                            │  │
│  │                                                                             │  │
│  │  ┌─ QUESTIONS (5) ──────────────────────────────────────────────────────┐   │  │
│  │  │                                                                       │   │  │
│  │  │ Q1. What is the value of x in 2x + 5 = 15?                           │   │  │
│  │  │     A) 3    B) 5    C) 7    D) 10    Correct: B    Marks: 2       │   │  │
│  │  │                                                       [Edit] [🗑️]   │   │  │
│  │  │                                                                       │   │  │
│  │  │ Q2. Factorize: x² - 9                                               │   │  │
│  │  │     A) (x-3)²  B) (x+3)²  C) (x-3)(x+3)  D) x(x-9)  Correct: C   │   │  │
│  │  │                                                       [Edit] [🗑️]   │   │  │
│  │  │                                                                       │   │  │
│  │  │ [+ Add Question]                                                     │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                             │  │
│  │  Total Marks: 10                                                            │  │
│  │                                                                             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                                  │  │
│  │  │   Save Changes   │  │     Cancel      │                                  │  │
│  │  └─────────────────┘  └─────────────────┘                                  │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. User Flows

### 5.1 Adding Content (Example: Adding an Exercise)

```
Current Flow (Entity Tree):
1. Click "Content Management" in sidebar
2. See empty detail panel
3. Expand Board (click chevron)
4. Expand Class (click chevron)
5. Expand Subject (click chevron)
6. Click Chapter to select it
7. See detail panel with "Add Exercise" button
8. Click "Add Exercise"
9. Fill form
10. Submit

= 9 interactions, 3 levels of mental context

New Flow (Tab Navigation):
1. Click "Content Management" in sidebar
2. Click "Exercises" tab
3. Click "+ Add Exercise" button
4. Fill form (chapter selector shows hierarchy clearly)
5. Submit

= 4 interactions, flat context
```

### 5.2 Editing Content (Example: Editing a Quiz)

```
Current Flow:
1. Navigate to Content Management
2. Expand Entity Tree: Board → Class → Subject → Chapter
3. Click Chapter to select
4. [No quiz shown - they're not in the tree!]
5. Must go to separate page or know the URL

New Flow:
1. Click "Content Management"
2. Click "Quizzes" tab
3. See all quizzes in table
4. Click [Edit] on desired quiz row
5. Edit form opens

= 4 interactions, direct access
```

### 5.3 Finding Content by Chapter Context

For users who know the chapter they want:

```
1. Click "Chapters" tab
2. See chapters list with subject/class/board breadcrumb
3. Each row shows: "Punjab / Matric / Math / Ch 3"
4. Actions visible: [Exercises (5)] [Quiz (1)] [Cards (10)] [Edit]
5. Click "Edit" for direct chapter edit
6. OR click "Exercises (5)" to filter exercises tab to that chapter
```

---

## 6. Route Structure

```
/admin/content
├── /boards
│   ├── (list - boards table)
│   ├── /add
│   └── /[id]/edit
├── /classes
│   ├── (list)
│   ├── /add
│   └── /[id]/edit
├── /subjects
│   ├── (list)
│   ├── /add
│   └── /[id]/edit
├── /chapters
│   ├── (list)
│   ├── /add
│   └── /[id]/edit
├── /exercises
│   ├── (list - all exercises)
│   ├── /add?chapterId=X        ← pre-selects chapter
│   └── /[id]/edit
├── /quizzes
│   ├── (list)
│   ├── /add?chapterId=X
│   └── /[id]/edit
└── /flashcards
    ├── (list)
    ├── /add?chapterId=X
    └── /[id]/edit
```

---

## 7. Component Inventory

### New Components to Create

| Component | Purpose | File Location |
|-----------|---------|--------------|
| `ContentTabs` | Tab navigation for content types | `components/admin/content-tabs.tsx` |
| `ContentListTable` | Reusable table for all content lists | `components/admin/content-list-table.tsx` |
| `ContentStatsStrip` | Stats cards showing counts | `components/admin/content-stats-strip.tsx` |
| `ExerciseForm` | Add/Edit exercise form | `app/admin/exercises/add/exercise-form.tsx` |
| `ExerciseEditForm` | Edit exercise form | `app/admin/exercises/[id]/edit/exercise-form.tsx` |
| `QuizForm` | Add/Edit quiz form | `app/admin/quizzes/add/quiz-form.tsx` |
| `QuizEditForm` | Edit quiz with questions | `app/admin/quizzes/[id]/edit/quiz-form.tsx` |
| `FlashCardForm` | Add/Edit flash card deck | `app/admin/flashcards/add/flashcard-form.tsx` |
| `FlashCardEditForm` | Edit flash card deck | `app/admin/flashcards/[id]/edit/flashcard-form.tsx` |

### Components to Modify

| Component | Changes |
|-----------|---------|
| `admin-nav-config.ts` | No changes needed - Content Management is one nav item |
| `entity-tree.tsx` | Mark as deprecated, keep for backward compatibility |
| `entity-detail-panel.tsx` | Will be replaced by new content tabs UI |
| `content-dashboard.tsx` | Replace with new tab-based dashboard |
| `admin/index.ts` | Export new components |

### Reusable Pattern: Content List Table

The `ContentListTable` component should accept:
```typescript
type ContentListTableProps<T> = {
  title: string;
  items: T[];
  columns: ColumnDef<T>[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  addHref: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
};
```

---

## 8. Design System Integration

### CSS Variables (from design system)

```css
/* Use existing design system tokens */
--primary: #7ac943;           /* Brand green */
--primary-light: rgba(122, 201, 67, 0.15);
--foreground: #1a1a1a;
--muted-foreground: #666666;
--border: #e5e5e5;
--card: #ffffff;
--background: #fafafa;

/* Dark theme handled by data-theme attribute */
[data-theme="dark"] {
  --foreground: #fafafa;
  --muted-foreground: #999999;
  --border: #333333;
  --card: #1a1a1a;
  --background: #0a0a0a;
}
```

### Typography
- Page headers: `font-heading`, `text-2xl`, `font-semibold`
- Section titles: `font-heading`, `text-lg`, `font-semibold`
- Table headers: `text-sm`, `font-medium`, uppercase, tracking-wide
- Table cells: `text-sm`

### Spacing
- Container padding: `var(--space-4)` (16px)
- Section gaps: `var(--space-6)` (24px)
- Card padding: `var(--space-6)` (24px)

---

## 9. Implementation Priority

### Phase 1: Navigation Foundation
1. Create `ContentTabs` component
2. Create `ContentStatsStrip` component
3. Create new `ContentDashboard` with tab navigation
4. Update `/admin/content/page.tsx`

### Phase 2: Content Type Pages
5. Create `/admin/content/boards/page.tsx`
6. Create `/admin/content/classes/page.tsx`
7. Create `/admin/content/subjects/page.tsx`
8. Create `/admin/content/chapters/page.tsx`

### Phase 3: New Content Types
9. Create `/admin/content/exercises/page.tsx` (list)
10. Create `/admin/content/exercises/add/page.tsx`
11. Create `/admin/content/exercises/[id]/edit/page.tsx`
12. Create `/admin/content/quizzes/page.tsx`
13. Create `/admin/content/quizzes/add/page.tsx`
14. Create `/admin/content/quizzes/[id]/edit/page.tsx`
15. Create `/admin/content/flashcards/page.tsx`
16. Create `/admin/content/flashcards/add/page.tsx`
17. Create `/admin/content/flashcards/[id]/edit/page.tsx`

### Phase 4: Cleanup
18. Mark `entity-tree.tsx` as deprecated (keep for migration period)
19. Update breadcrumb patterns across all new pages
20. Add URL redirect from old patterns if any

---

## 10. Accessibility Requirements

- **Tab navigation**: Arrow keys to move between tabs, Enter/Space to activate
- **Table navigation**: Proper `<table>`, `<thead>`, `<tbody>` semantics
- **Focus management**: Focus moves to form when opening add/edit screens
- **Screen reader**: Tab labels announce content type and count
- **Keyboard shortcuts**:
  - `N` for new item (when list is focused)
  - `E` for edit (when row is focused)
  - `Escape` to cancel and return to list

---

## 11. Responsive Behavior

### Desktop (1024px+)
- Full table with all columns visible
- Tab bar horizontal, all tabs visible

### Tablet (768px - 1023px)
- Some columns may be hidden (configurable per content type)
- Tab bar scrollable if needed

### Mobile (< 768px)
- Table transforms to card list
- Each "row" becomes a card with all info
- Tab bar becomes horizontally scrollable
- Edit button always visible on cards

---

## 12. Migration Notes

### Preserving User Context
- When a user clicks "Edit" from entity-detail-panel, redirect to new URL
- Entity tree selection should highlight corresponding tab row

### API Compatibility
- All existing API functions remain unchanged
- New API functions needed for:
  - `getAdminExercises(chapterId?)` - already exists
  - `getAdminQuizzes(chapterId?)` - needs backend support
  - `getAdminFlashCardDecks(chapterId?)` - needs backend support
  - `createAdminQuiz(...)` - needs backend support
  - `updateAdminQuiz(...)` - needs backend support
  - `deleteAdminQuiz(...)` - needs backend support
  - Similar for FlashCards

---

## Summary

This redesign transforms the content management experience from:

| Aspect | Before | After |
|--------|--------|-------|
| Navigation | Hierarchical tree (4 levels) | Flat tabs (1 level) |
| Finding content | Expand 4 levels | Click 1 tab |
| Edit access | Hidden behind selections | Visible on every row |
| New content types | Not accessible | First-class tabs |
| Clicks to edit | 6-8 | 2-3 |
| URL structure | Flat with tree selection | RESTful, bookmarkable |

The result is a **faster, more intuitive, and more maintainable** content management system that scales well as new content types are added.
