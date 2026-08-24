import assert from "node:assert/strict";
import test from "node:test";

import { buildLearningPathRecommendations } from "../../lib/learning-path.js";

test("buildLearningPathRecommendations prioritizes weak quiz performance with weighted scoring", () => {
  const result = buildLearningPathRecommendations({
    signals: [
      {
        chapterId: 101,
        chapterTitle: "Quadratic Equations",
        hasProgressSignal: true,
        quizScorePercent: 35,
        exercisesViewed: 1,
        totalExercises: 8,
        aiSessionCount: 2,
        weakTopicMatch: true,
      },
      {
        chapterId: 102,
        chapterTitle: "Sets and Functions",
        hasProgressSignal: true,
        quizScorePercent: 60,
        exercisesViewed: 0,
        totalExercises: 8,
        aiSessionCount: 0,
        weakTopicMatch: false,
      },
      {
        chapterId: 103,
        chapterTitle: "Trigonometry",
        hasProgressSignal: true,
        quizScorePercent: 80,
        exercisesViewed: 6,
        totalExercises: 8,
        aiSessionCount: 3,
        weakTopicMatch: false,
      },
    ],
    limit: 3,
  });

  assert.equal(result.recommendedChapters.length, 3);
  assert.equal(result.recommendedChapters[0]?.chapterId, 101);
  assert.equal(result.recommendedChapters[0]?.priority, 1);
  assert.match(result.recommendedChapters[0]?.reason ?? "", /quiz|ai tutor/i);
  assert.deepEqual(result.studentWeakAreas, [
    "Quadratic Equations",
    "Sets and Functions",
    "Trigonometry",
  ]);
});

test("buildLearningPathRecommendations ignores chapters with no stored weak-area signals", () => {
  const result = buildLearningPathRecommendations({
    signals: [
      {
        chapterId: 201,
        chapterTitle: "Probability",
        hasProgressSignal: false,
        quizScorePercent: null,
        exercisesViewed: 0,
        totalExercises: 10,
        aiSessionCount: 0,
        weakTopicMatch: false,
      },
      {
        chapterId: 202,
        chapterTitle: "Matrices",
        hasProgressSignal: true,
        quizScorePercent: null,
        exercisesViewed: 2,
        totalExercises: 10,
        aiSessionCount: 1,
        weakTopicMatch: false,
      },
    ],
    limit: 5,
  });

  assert.deepEqual(
    result.recommendedChapters.map((chapter) => chapter.chapterId),
    [202]
  );
});
