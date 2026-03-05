# Summary Markdown Import Design

## Goal

Add a second summary input option in both admin chapter summary entry points:

- `Paste markdown` for direct editing in the existing form field or editor.
- `Upload .md file` to import markdown from disk into the current summary field for review before submit or save.

Imported markdown must never auto-save or auto-submit. Admins review the imported content and explicitly submit the add form or save the existing chapter editor.

## Current Context

- The chapter add form and chapter summary editor both live in `frontend/components/admin/admin-curriculum-builder.tsx`.
- Existing chapter summaries already load into the editor from the admin summary API.
- The add form currently uses a textarea plus preview toggle for markdown entry.
- The only current file inputs in this workspace are the edit-mode Markdown import control and the figure upload control.

## Recommended Approach

Keep the change in the existing chapter workflow instead of introducing a separate modal or route.

This keeps the workflow simple:

1. Select a chapter.
2. Choose how to bring markdown into the summary field.
3. Review the content in place.
4. Submit the add form or save with the existing summary save button.

## UI Design

Add lightweight summary import controls in both chapter summary entry points.

- In `Add Chapter`, place `Upload .md file` beside the existing summary textarea and preview controls.
- In `Edit Chapter`, keep the existing `Paste markdown` and `Upload .md file` controls near the summary editor.
- `Paste markdown` remains the default editing path and maps to the existing textarea or editor.
- `Upload .md file` opens a file picker restricted to Markdown-like files such as `.md` and `text/markdown`.
- Imported content replaces the current local summary draft only after any required confirmation.
- The existing figure upload controls remain separate because they insert media assets, not summary source content.

## Data Flow

The `.md` import stays client-side.

1. Admin selects a Markdown file.
2. The frontend reads the file contents with the browser File API.
3. The imported text is loaded into either the add-form summary field or the existing CodeMirror editor state.
4. The admin reviews or edits the content.
5. The existing add-chapter submit or summary save action persists the final markdown through the current API.

No backend API or database schema changes are required for this feature.

## Unsaved Change Handling

Importing a file can overwrite local edits, so both UI paths must guard that path.

- In `Edit Chapter`, if the editor matches the last loaded or last saved summary state, import proceeds directly.
- In `Edit Chapter`, if the editor has unsaved changes, the UI shows a confirmation before replacing editor content.
- In `Add Chapter`, if the summary field is empty, import proceeds directly.
- In `Add Chapter`, if the summary field already has typed content, the UI shows a confirmation before replacing it.
- If the admin cancels, the current local draft remains unchanged.

## Error Handling

- Reject empty or unreadable files with a toast error.
- Reset each file input after every import attempt so the same file can be chosen again if needed.
- Preserve current local draft when file reading fails or confirmation is declined.

## Testing

Add focused frontend coverage for:

- importing a `.md` file into the add form without auto-submitting
- confirmation shown when add-form draft text would be replaced
- cancel path preserving current add-form content
- importing a `.md` file into the summary editor without auto-saving
- confirmation shown when unsaved editor changes would be replaced
- cancel path preserving current editor content
- successful import replacing local content after confirmation in both flows

## Out of Scope

- backend upload/storage for Markdown files
- version history for imported summaries
- changing the existing figure upload behavior
