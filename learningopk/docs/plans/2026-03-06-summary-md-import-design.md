# Summary Markdown Import Design

## Goal

Add a second summary input option in the admin chapter summary workspace:

- `Paste markdown` for direct editing in the existing CodeMirror editor.
- `Upload .md file` to import markdown from disk into the editor for review before save.

The imported markdown must never auto-save. Admins review the imported content in the editor and explicitly save it with the existing save action.

## Current Context

- The summary editor lives in `frontend/components/admin/admin-curriculum-builder.tsx`.
- Existing chapter summaries already load into the editor from the admin summary API.
- The only current file input in this workspace is for figure uploads, which posts image assets and inserts image markdown into the summary.

## Recommended Approach

Keep the change in the existing summary editor instead of introducing a separate modal or route.

This keeps the workflow simple:

1. Select a chapter.
2. Choose how to bring markdown into the editor.
3. Review the content in place.
4. Save with the existing summary save button.

## UI Design

Add a lightweight summary import control near the existing editor actions.

- `Paste markdown` remains the default editing path and maps to the existing editor.
- `Upload .md file` opens a file picker restricted to Markdown-like files such as `.md` and `text/markdown`.
- Imported content replaces the current editor content only after any required confirmation.
- The existing figure upload controls remain separate because they insert media assets, not summary source content.

## Data Flow

The `.md` import stays client-side.

1. Admin selects a Markdown file.
2. The frontend reads the file contents with the browser File API.
3. The imported text is loaded into the existing CodeMirror editor state.
4. The admin reviews or edits the content.
5. The existing summary save action persists the final markdown through the current API.

No backend API or database schema changes are required for this feature.

## Unsaved Change Handling

Importing a file can overwrite local edits, so the UI must guard that path.

- If the editor matches the last loaded or last saved summary state, import proceeds directly.
- If the editor has unsaved changes, the UI shows a confirmation before replacing editor content.
- If the admin cancels, the current editor content remains unchanged.

## Error Handling

- Reject empty or unreadable files with a toast error.
- Reset the file input after each import attempt so the same file can be chosen again if needed.
- Preserve current editor content when file reading fails or confirmation is declined.

## Testing

Add focused frontend coverage for:

- importing a `.md` file into the summary editor without auto-saving
- confirmation shown when unsaved editor changes would be replaced
- cancel path preserving current editor content
- successful import replacing editor content after confirmation

## Out of Scope

- backend upload/storage for Markdown files
- version history for imported summaries
- changing the existing figure upload behavior
