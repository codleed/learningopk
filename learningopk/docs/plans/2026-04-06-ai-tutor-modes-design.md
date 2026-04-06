# AI Tutor Modes Design

## Goal

Make AI tutor responses consistently render as polished Markdown with proper LaTeX math notation, and make `Explain` and `Socratic` modes behave differently in practice.

## Current Problem

- The frontend already renders Markdown and KaTeX math.
- The tutor mode toggle exists in the UI but is not sent to the backend.
- The backend system prompt always biases toward Socratic behavior.
- As a result, `Explain` mode is not truly direct, and mathematical notation is inconsistent.

## Desired Behavior

### Explain Mode

- Give the direct answer first.
- Use short Markdown structure when helpful, such as:
  - `## Idea`
  - `## Formula`
  - `## Steps`
  - `## Final Answer`
- Use proper LaTeX notation for equations, symbols, fractions, powers, subscripts, and roots.
- Keep the response teacher-like, concise, and straightforward.
- Avoid unnecessary Socratic questioning.

### Socratic Mode

- Lead the student to the answer instead of dumping it immediately.
- Ask one main guiding question at a time.
- If helpful, give a very small hint first, then the guiding question.
- Keep the current reveal-stage policy, but only for Socratic mode.

### Shared Formatting Rules

- All responses must be valid Markdown.
- All math should use LaTeX-friendly notation.
- Prefer structure over wall-of-text.
- Keep responses readable for 9th/10th grade students.

## Technical Design

### Backend

- Extend the AI chat request body with `mode: "explain" | "socratic"`.
- Introduce a tutor mode type in `backend/src/lib/mistral.ts`.
- Update `buildTutorSystemPrompt()` to accept mode-specific behavior.
- Keep reveal-stage logic for Socratic mode only.
- Add explicit formatting instructions requiring Markdown and LaTeX math.

### Frontend

- Send the selected tutor mode in `POST /api/ai/chat`.
- Keep existing Markdown rendering path because it already supports math.
- Preserve current UI toggle and messaging.

## Testing

- Add backend unit tests to verify:
  - explain mode prompt asks for direct explanations
  - socratic mode prompt asks for hint-plus-question behavior
  - math and Markdown formatting instructions are present
- Run backend and frontend typechecks after implementation.

## Risks

- Prompt-only changes can still vary by model output, so the prompt contract should be explicit and narrow.
- Streaming remains plain text while tokens are in flight, but final rendered output will still use Markdown + KaTeX.
