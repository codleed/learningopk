import assert from "node:assert/strict";
import test from "node:test";

import { forumRepository, progressRepository, learnRepository, quizRepository } from "../../../repositories/index.js";

test("All repositories are exported and initialized", () => {
  assert.ok(forumRepository);
  assert.ok(progressRepository);
  assert.ok(learnRepository);
  assert.ok(quizRepository);
});

test("LearnRepository has required methods", () => {
  assert.ok(typeof learnRepository.findAllBoards === "function");
  assert.ok(typeof learnRepository.findAllBoardClasses === "function");
  assert.ok(typeof learnRepository.findAllSubjectsWithBoard === "function");
  assert.ok(typeof learnRepository.findAllSubjects === "function");
  assert.ok(typeof learnRepository.findSubjectByRoute === "function");
  assert.ok(typeof learnRepository.findChaptersBySubject === "function");
  assert.ok(typeof learnRepository.findChapterBySlug === "function");
  assert.ok(typeof learnRepository.findExercisesByChapter === "function");
  assert.ok(typeof learnRepository.findFlashcardsByChapter === "function");
  assert.ok(typeof learnRepository.findQuizByChapter === "function");
  assert.ok(typeof learnRepository.findQuizQuestions === "function");
});

test("QuizRepository has required methods", () => {
  assert.ok(typeof quizRepository.findQuizById === "function");
  assert.ok(typeof quizRepository.findQuestionsByQuizId === "function");
  assert.ok(typeof quizRepository.createAttempt === "function");
  assert.ok(typeof quizRepository.findAttemptsByUserId === "function");
});

test("ProgressRepository has required methods", () => {
  assert.ok(typeof progressRepository.findChapterById === "function");
  assert.ok(typeof progressRepository.findSubjectBySlug === "function");
  assert.ok(typeof progressRepository.findChaptersBySubject === "function");
  assert.ok(typeof progressRepository.findQuizTotalMarksBySubject === "function");
  assert.ok(typeof progressRepository.findProgressByUserId === "function");
  assert.ok(typeof progressRepository.findRecentChapterVisits === "function");
  assert.ok(typeof progressRepository.findRecentQuizAttempts === "function");
  assert.ok(typeof progressRepository.findQuizHistory === "function");
});

test("ForumRepository has required methods", () => {
  assert.ok(typeof forumRepository.findFilters === "function");
  assert.ok(typeof forumRepository.findThreads === "function");
  assert.ok(typeof forumRepository.incrementThreadViews === "function");
  assert.ok(typeof forumRepository.findThreadById === "function");
  assert.ok(typeof forumRepository.findRepliesByThreadId === "function");
  assert.ok(typeof forumRepository.findVotesByUserAndReplies === "function");
  assert.ok(typeof forumRepository.findReplyById === "function");
});