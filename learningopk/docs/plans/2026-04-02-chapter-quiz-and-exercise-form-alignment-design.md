# Chapter Quiz Visibility and Exercise Form Alignment Design

## Context

There are two admin entry points to create exercises:

1. Chapter manage screen (`/admin/content/chapters/[id]/manage`)
2. Global admin content screen (`/admin/content/exercises/...`)

The current behavior is inconsistent between these flows, and quiz visibility in student chapter challenge can fail when multiple quiz types exist for the same chapter.

## Problems Observed

1. A quiz created in chapter manage does not always show in student Chapter Challenge.
2. Exercise form fields are not type-aware in chapter manage.
3. Global add/edit exercise forms do not fully match the supported exercise types and behavior.
4. Question and solution markdown expectations are inconsistent across authoring and rendering.

## Decision

Implement **Option 1**:

- Fix chapter challenge quiz selection to use `chapter_quiz` only.
- Normalize exercise forms to be type-specific in both admin entry points.
- Keep existing architecture and APIs where possible.
- Avoid full form-component refactor in this pass.

## Target Behavior

### Quiz Behavior (Student Chapter Challenge)

- Chapter challenge must resolve quiz by `quizzes.type = "chapter_quiz"`.
- `mock_exam` remains separate and must not replace chapter challenge quiz.

### Exercise Type Behavior

1. `long`
   - Question: markdown input
   - Solution: markdown input
2. `short`
   - Question: markdown input
   - Solution: markdown input
3. `fill_in_blanks`
   - Question: markdown input with `{{blank}}` support
   - Solution: markdown input
   - Blanks answers: structured answers input
4. `numerical`
   - Question: markdown input
   - Solution: markdown input
   - Illustration: HTML/CSS/JS visualization editor

### Markdown Requirement

- All question and solution authoring must use markdown editors.
- All student-facing question and solution rendering must use markdown renderer.

## Scope

### Backend

- Update learn repository chapter quiz lookup to filter by `chapter_quiz`.
- Keep learn chapter API response contract unchanged except corrected quiz selection semantics.
- Add test coverage for chapter having both `chapter_quiz` and `mock_exam`.

### Frontend - Chapter Manage

- File: `frontend/src/components/admin/chapter-exercise-manager.tsx`
- Replace generic always-visible question/solution block with type-aware field groups.
- Ensure create/update payload includes the correct type-specific fields.
- Ensure validation is type-aware.

### Frontend - Admin Content Add/Edit

- Files:
  - `frontend/app/admin/content/exercises/add/add-exercise-form.tsx`
  - `frontend/app/admin/content/exercises/[id]/edit/edit-exercise-form.tsx`
- Add missing `fill_in_blanks` support.
- Align field behavior to same type-specific model used in chapter manage.
- Keep payload compatible with backend validation (`blanksAnswer`, numerical fields when required).

### Frontend - Student Rendering

- File: `frontend/src/components/learn/quest-exercises-view.tsx`
- Preserve markdown renderer usage for question/solution.
- Keep numerical visualization and fill-in-blanks interactive rendering behavior.

## Validation Plan

1. Chapter quiz selection test proves `chapter_quiz` is selected when both types exist.
2. Manual check:
   - Create chapter quiz in chapter manage, confirm it appears in student chapter challenge.
3. Manual check for each exercise type from both admin entry points:
   - `short`, `long`, `fill_in_blanks`, `numerical`
   - Confirm correct field visibility, successful save, and student rendering.
4. Verify markdown rendering for all question and solution outputs.

## Non-Goals

- No shared unified form refactor in this pass.
- No new backend schema redesign beyond existing supported fields.
- No mock exam UX redesign.
