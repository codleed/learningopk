-- Add type column to quiz_attempts for tracking mock_exam vs chapter_quiz
ALTER TABLE quiz_attempts ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'chapter_quiz';

-- Backfill existing records with type based on quiz type
UPDATE quiz_attempts
SET type = COALESCE(
  (SELECT q.type FROM quizzes q WHERE q.id = quiz_attempts.quiz_id),
  'chapter_quiz'
)
WHERE type = 'chapter_quiz';
