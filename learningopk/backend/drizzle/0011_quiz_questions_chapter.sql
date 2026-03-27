-- Add chapter_id to quiz_questions for section-wise scoring in mock exams
ALTER TABLE quiz_questions ADD COLUMN chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX idx_quiz_questions_chapter ON quiz_questions(chapter_id);
