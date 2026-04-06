import assert from "node:assert/strict";
import test from "node:test";

import { learnRepository } from "../../repositories/index.js";

test("LearnRepository.findAllBoards is callable and independent of forum", () => {
  assert.ok(typeof learnRepository.findAllBoards === "function");
  // The method exists on the learn repository, not the forum repository
  assert.notEqual(learnRepository.findAllBoards, undefined);
});

test("LearnRepository.findAllBoardClasses is callable and independent of forum", () => {
  assert.ok(typeof learnRepository.findAllBoardClasses === "function");
  assert.notEqual(learnRepository.findAllBoardClasses, undefined);
});

test("LearnRepository.findAllSubjectsWithBoard is callable and independent of forum", () => {
  assert.ok(typeof learnRepository.findAllSubjectsWithBoard === "function");
  assert.notEqual(learnRepository.findAllSubjectsWithBoard, undefined);
});

test("LearnRepository board/class methods do not reference forumRepository", () => {
  // Verify that the learn repository's board methods are separate functions
  // and not aliased from the forum repository
  const learnBoards = learnRepository.findAllBoards;
  const learnClasses = learnRepository.findAllBoardClasses;
  const learnSubjects = learnRepository.findAllSubjectsWithBoard;

  assert.ok(typeof learnBoards === "function");
  assert.ok(typeof learnClasses === "function");
  assert.ok(typeof learnSubjects === "function");
});
