# Curriculum Builder Design

## Context
- The current schema hardcodes class as `subjects.grade` (`9` or `10`) and links subjects directly to boards.
- Admin content currently manages chapter publish state only.
- Requirement: model and manage `board -> class -> subject -> chapter` with admin create flows for all four levels.
- Constraint: do not hard-enforce fixed class counts or fixed subject counts because future expansion is expected.

## Approved Direction
- Use a normalized curriculum hierarchy:
  - `boards` (existing)
  - `board_classes` (new)
  - `subjects` linked to `board_classes` (updated)
  - `chapters` linked to `subjects` (existing relation retained)
- Keep summaries/exercises/flashcards/quizzes attached to chapters.
- Extend admin content API/UI with CRUD creation endpoints and a nested curriculum tree endpoint.
- Implement with runtime TDD; skip compile-time-only TypeScript tests.

## Schema Design

### Boards
- Keep existing `boards` table and unique `slug`.

### Board Classes
- Add `board_classes` table:
  - `id` serial primary key
  - `board_id` fk to `boards.id` with cascade delete
  - `name` text not null (example: `9th`)
  - `slug` text not null
- Unique index on `(board_id, slug)`.

### Subjects
- Replace subject parent keys:
  - remove `board_id`
  - remove `grade` enum usage
  - add `board_class_id` fk to `board_classes.id` with cascade delete
- Keep `name`, `slug`, `icon`, `description`.
- Unique index on `(board_class_id, slug)`.

### Chapters
- Keep relation `chapters.subject_id`.
- Add unique index `(subject_id, chapter_number)` to guard ordering collisions.
- Keep existing `(subject_id, slug)` uniqueness.

## Learning Content Ownership
- `Subject` is a container.
- `Chapter` owns learning artifacts:
  - summary (`chapters.summary`, optional summary media table)
  - exercises (`exercises.chapter_id`)
  - flashcards (`flashcards.chapter_id`)
  - quizzes (`quizzes.chapter_id`, then `quiz_questions`)

## Admin API Design

### New Endpoints
- `GET /api/admin/content/curriculum`
  - returns nested tree: boards -> classes -> subjects -> chapters
- `POST /api/admin/content/boards`
  - create board (`name`, `slug`)
- `POST /api/admin/content/classes`
  - create class under board (`boardId`, `name`, `slug`)
- `POST /api/admin/content/subjects`
  - create subject under class (`boardClassId`, `name`, `slug`, optional `icon`, `description`)
- `POST /api/admin/content/chapters`
  - create chapter under subject (`subjectId`, `chapterNumber`, `title`, `slug`, `summary`, optional `isPublished`)

### Common API Rules
- Require session and admin role.
- Validate payloads and query params with zod.
- Persist admin audit logs under `content` scope for successful and failed create attempts.

## Admin UI Design
- Extend `/admin/content` with a new section: `Curriculum Builder`.
- Include four compact creation forms:
  - Board
  - Class (board-select)
  - Subject (class-select)
  - Chapter (subject-select)
- Render nested curriculum tree below forms for immediate feedback.
- Preserve existing Chapter Publish Controls and audit log section.

## Migration and Backfill
- Create `board_classes`.
- Backfill classes from existing distinct (`subjects.board_id`, `subjects.grade`) pairs.
- Add `subjects.board_class_id` and backfill by join.
- Move related queries to derive board/class from `subjects -> board_classes -> boards`.
- Remove old subject columns after backfill and reference updates.
- Add chapter number uniqueness index.

## Testing Strategy
- Integration tests (backend):
  - auth and role enforcement for new endpoints
  - payload validation failures
  - successful create flows for board/class/subject/chapter
  - curriculum tree retrieval
  - content audit log persistence
- Frontend runtime checks:
  - admin content page loads tree
  - successful form submit updates visible tree

