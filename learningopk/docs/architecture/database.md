# 4. Database Schema

All tables use Drizzle ORM with PostgreSQL. Below is the complete schema
design the AI coder must implement.

## Tables Overview

### users

- id (uuid, pk), email (text, unique), name (text), avatar_url (text),
  role (enum: student \| admin)

- created_at, updated_at --- timestamps

- Managed by Better Auth --- do not create manually; Better Auth
  generates its own user table

### boards

- id (serial, pk), name (text) --- e.g. \'Federal Board\', \'Punjab
  Board\', \'Sindh Board\'

- slug (text, unique) --- e.g. \'federal\', \'punjab\', \'sindh\'

### subjects

- id (serial, pk), board_id (fk â†’ boards), grade (enum: 9 \| 10)

- name (text) --- e.g. \'Mathematics\', \'Physics\', \'Chemistry\',
  \'Biology\', \'English\', \'Urdu\', \'Pakistan Studies\',
  \'Islamiat\', \'Computer Science\'

- slug (text), icon (text), description (text)

### chapters

- id (serial, pk), subject_id (fk â†’ subjects), chapter_number
  (integer)

- title (text), slug (text), summary (text --- rich text/markdown)

- is_published (boolean, default false)

### exercises

- id (serial, pk), chapter_id (fk â†’ chapters)

- exercise_number (text) --- e.g. \'1.1\', \'1.2a\'

- question (text), solution (text --- markdown with steps), difficulty
  (enum: easy \| medium \| hard)

- type (enum: mcq \| short \| long \| numerical)

### flashcards

- id (serial, pk), chapter_id (fk â†’ chapters)

- front (text --- term/concept), back (text ---
  definition/explanation)

- order_index (integer)

### quizzes

- id (serial, pk), chapter_id (fk â†’ chapters), title (text)

- duration_minutes (integer, default 30), total_marks (integer)

- type (enum: chapter_quiz \| mock_exam)

### quiz_questions

- id (serial, pk), quiz_id (fk â†’ quizzes)

- question (text), option_a/b/c/d (text), correct_option (enum:
  a\|b\|c\|d)

- explanation (text --- shown after answer), marks (integer, default 1)

### quiz_attempts

- id (uuid, pk), user_id (fk â†’ users), quiz_id (fk â†’ quizzes)

- answers (jsonb --- { question_id: selected_option }), score
  (integer), total_marks (integer)

- started_at (timestamp), completed_at (timestamp)

### ai_chat_sessions

- id (uuid, pk), user_id (fk â†’ users), chapter_id (fk â†’ chapters,
  nullable)

- title (text, auto-generated), created_at, last_message_at

### ai_messages

- id (uuid, pk), session_id (fk â†’ ai_chat_sessions)

- role (enum: user \| assistant), content (text)

- created_at (timestamp)

### forum_threads

- id (uuid, pk), user_id (fk â†’ users), subject_id (fk â†’ subjects,
  nullable), chapter_id (fk â†’ chapters, nullable)

- title (text), body (text --- markdown), is_pinned (boolean),
  is_solved (boolean)

- views (integer, default 0), created_at, updated_at

### forum_replies

- id (uuid, pk), thread_id (fk â†’ forum_threads), user_id (fk â†’ users),
  parent_reply_id (self-ref, nullable for nested replies)

- body (text --- markdown), is_accepted_answer (boolean), upvotes
  (integer, default 0)

- created_at, updated_at

### user_progress

- id (serial, pk), user_id (fk â†’ users), chapter_id (fk â†’ chapters)

- visited_at (timestamp), exercises_viewed (integer),
  flashcards_completed (boolean)

- quiz_best_score (integer), quiz_attempts_count (integer)

- UNIQUE(user_id, chapter_id)

### mock_exams

- id (serial, pk), board_id (fk â†’ boards), grade (enum: 9\|10),
  subject_id (fk â†’ subjects)

- title (text), year (integer --- e.g. 2023 past paper),
  duration_minutes (integer), total_marks (integer)

- Reuses quiz_questions table via quiz_id link
