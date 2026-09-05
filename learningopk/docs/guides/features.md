# 5. Feature Breakdown & Implementation Details

## 5.1 Authentication --- Better Auth

Better Auth is a full-featured, locally-runnable auth library used by the
Express backend. It handles sessions, email/password sign-up, and optional
OAuth (Google).

### Implementation Steps

- Install: pnpm add better-auth

- Create backend/src/lib/auth.ts --- define Drizzle adapter pointing to
  local PostgreSQL

- Run Better Auth\'s schema migration to create users, sessions,
  accounts tables

- Create backend/src/routes/auth.ts --- mount Better Auth handler at
  /api/auth/* in Express

- Create frontend/middleware.ts --- protect all /dashboard/* routes,
  redirect unauthenticated users to /login

- Build pages: /login, /register, /forgot-password using Better
  Auth\'s built-in methods

- Add session provider to root layout.tsx

### User Roles

- student (default) --- can access all learning features

- admin --- can publish chapters, manage content via /admin dashboard

## 5.2 Content System --- Chapters, Solutions & PDF Seeding

### PDF Seeding Script

Create a standalone CLI script at backend/scripts/seed-content.ts that
the developer runs once locally:

- Use pdf-parse to extract raw text from each PDF

- Parse text into chapters, exercises, summaries using regex or
  AI-assisted parsing

- Insert into PostgreSQL via Drizzle

- Support multiple boards: pass \--board=punjab \--grade=9
  \--subject=math as CLI flags

- Idempotent: skip already-seeded chapters (check by slug)

### Content Pages

- /\[board\]/\[grade\]/\[subject\] --- subject home showing chapter
  list with progress rings

- /\[board\]/\[grade\]/\[subject\]/\[chapter\] --- chapter page with
  tabs: Summary \| Exercises \| Quiz \| Flashcards

- Summary tab: renders chapter summary in markdown with MathJax for
  equations

- Exercises tab: accordion list of questions with expandable
  step-by-step solutions

- Each solution should show numbered steps, formulas, and a \'Ask AI
  Teacher\' button inline

### Math Rendering

- Install: pnpm add react-katex katex

- Wrap all solution content in a custom component that detects
  \$\...\$ and \$\$\...\$\$ and renders via KaTeX

- This is critical for Maths, Physics, Chemistry subjects

## 5.3 AI Agent Teacher --- Socratic Method

The AI teacher uses Mistral AI (mistral-small-latest model, free tier)
via the Vercel AI SDK. It must NEVER give direct answers --- only ask
guiding questions to lead the student to the answer themselves.

### System Prompt for Socratic Teaching

The system prompt must be hardcoded server-side and must include:

- You are an AI tutor for Pakistani 9th/10th grade students. You use
  the Socratic method exclusively.

- When a student asks for an answer, ask them a simpler question that
  breaks the problem down.

- When they answer correctly, praise them and move to the next step.

- When they answer incorrectly, gently point out the error and ask
  them to try again.

- You know the correct answer but never reveal it directly. Guide the
  student to discover it.

- Keep responses concise (3-5 sentences max). Use simple English
  appropriate for a 14-16 year old.

- If the topic involves a formula, ask the student to recall the
  formula first before applying it.

- Speak in a warm, encouraging, patient tone like a favourite teacher.

- Context: board={board}, grade={grade}, subject={subject},
  chapter={chapterTitle}

### Implementation

- Create backend/src/routes/ai-chat.ts --- POST endpoint (`/api/ai/chat`)
  using Vercel AI SDK streamText

- Load chapter context (summary + relevant exercise) and inject into
  system prompt

- Use useChat hook in client component for real-time streaming UI

- Persist each message to ai_messages table after streaming completes
  (using onFinish callback)

- Show AI chat as a slide-in panel on the chapter page --- accessible
  from any exercise

- Rate limit: 20 messages per student per hour (implement via Redis or
  simple DB counter)

- Include a \'Start fresh session\' button to clear context and begin
  new topic

### API Route Code Pattern

The AI coder must structure backend/src/routes/ai-chat.ts like this:

- Import { streamText } from \'ai\' and { createMistral } from
  \'@ai-sdk/mistral\'

- Validate session via Better Auth --- return 401 if not authenticated

- Parse body: { messages, chapterId, sessionId }

- Fetch chapter title from DB for context injection

- Call streamText({ model, system: socratiPrompt, messages }) and
  return result.toDataStreamResponse()

## 5.4 Quizzes, Flashcards & Mock Exams

### Flashcards

- Render as flippable cards using CSS 3D transform (no library needed)

- Show front (term) by default, flip on click to reveal back
  (definition)

- Navigation: Previous / Next buttons or swipe gesture

- Mark card as \'Known\' or \'Review Again\' --- store locally in
  state (no DB needed for basic version)

- Show completion progress: \'12 of 20 cards reviewed\'

### Chapter Quizzes

- 20 MCQ questions per chapter quiz, auto-generated from
  quiz_questions table

- Timed: configurable per quiz (default 30 minutes) --- show live
  countdown timer

- On submission: show score, correct answers, explanations per
  question

- Save attempt to quiz_attempts table --- update user_progress best
  score

- Allow unlimited retakes; track best score and all attempts

### Mock Exams

- Full-length past-paper style exams: 60-75 questions, 2-3 hours
  duration

- Separate from chapter quizzes --- board/grade/year specific

- Same UI as chapter quiz but with exam mode: no feedback until
  submission

- Display detailed result report: section-wise scores, time spent,
  weak areas

- Recommend chapters to revise based on wrong answers

## 5.5 Community Forum

A Reddit/StackOverflow style forum for students to discuss topics, share
problems, and help each other.

### Forum Structure

- /forum --- main feed showing all threads, filterable by
  subject/board/grade

- /forum/\[threadId\] --- thread detail with nested replies

- Threads can be tagged with subject + chapter for easy discovery

- Rich text editor: use a simple markdown textarea with preview toggle

### Features

- Post a question with title + markdown body

- Reply to threads (nested one level deep is sufficient for MVP)

- Upvote replies

- Mark a reply as \'Accepted Answer\' (thread author only)

- Search threads by keyword (use PostgreSQL full-text search --- no
  Elasticsearch needed)

- Filter by: subject, grade, board, solved/unsolved

- View count tracked on thread open

- Pin important threads (admin only)

### Implementation Notes

- For markdown rendering: install pnpm add react-markdown remark-gfm

- For full-text search: use PostgreSQL tsvector column on
  forum_threads.title + body

- Add GIN index on tsvector column for fast search

- No real-time updates needed for MVP --- simple page refresh or
  polling every 30s

## 5.6 Progress Tracking

Students can see their learning journey across all subjects with visual
progress indicators.

### Dashboard --- /dashboard

- Welcome card with student name, current streak (days in a row
  active)

- Subject cards: one per enrolled subject --- shows % of chapters
  visited, best quiz score, last active date

- Recent activity feed: last 5 chapters visited, last quiz scores

- Weekly activity heatmap (similar to GitHub contribution graph) ---
  show study days

### Subject Progress Page --- /dashboard/\[subject\]

- Chapter-by-chapter progress table: visited, exercises viewed, quiz
  attempted, best score

- Color-coded: green (quiz passed \>70%), yellow (attempted \<70%),
  grey (not started)

- Overall subject score: average of all chapter quiz best scores

### Progress Data Collection

- On chapter visit: upsert user_progress with visited_at timestamp

- On exercise expand: increment exercises_viewed counter

- On flashcard completion: set flashcards_completed = true

- On quiz submit: update quiz_best_score if new score is higher,
  increment quiz_attempts_count
