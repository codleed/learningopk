import { type ModelMessage, generateText } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../lib/db/index.js";
import { boards, chapters, quizAttempts, quizzes, subjects } from "../lib/db/schema.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { getMistralModel } from "../lib/mistral.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { aiContextRepository } from "../repositories/ai-context.repository.js";
import { learnRepository } from "../repositories/learn.repository.js";
import { examPatternRepository } from "../repositories/exam-pattern.repository.js";
import { listSubjectChapterGraph } from "../lib/chapter-graph.js";
import { progressService } from "../services/progress.service.js";
import { learningPathService } from "../services/learning-path.service.js";
import { errorResponse, successResponse } from "../lib/response.js";

const paramsSchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

const chapterParamsSchema = paramsSchema.extend({
  chapter: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export const learnRouter = Router();

learnRouter.get("/patterns/:board/:subject", async (req, res) => {
  const parsed = z
    .object({
      board: z.string().trim().regex(/^[a-z0-9-]+$/),
      subject: z.string().trim().regex(/^[a-z0-9-]+$/),
      grade: z.string().trim().regex(/^[a-z0-9-]+$/).optional()
    })
    .safeParse({ ...req.params, ...req.query });

  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid pattern route parameters", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const grade = parsed.data.grade ?? "9";
  const patterns = await examPatternRepository.findSubjectPatternsByRoute({
    board: parsed.data.board,
    grade,
    subject: parsed.data.subject
  });

  if (!patterns) {
    res.status(404).json(errorResponse("Pattern analysis not found", "NOT_FOUND"));
    return;
  }

  res.status(200).json(successResponse({
    ...patterns,
    grade
  }));
});

learnRouter.get("/boards", async (_req, res) => {
  const [boardRows, classRows] = await Promise.all([
    learnRepository.findAllBoards(),
    learnRepository.findAllBoardClasses()
  ]);

  res.status(200).json({
    boards: boardRows,
    classes: classRows
  });
});

learnRouter.get("/subjects", async (_req, res) => {
  const subjectRows = await learnRepository.findAllSubjectsWithBoard();

  res.status(200).json({
    subjects: subjectRows
  });
});

learnRouter.get("/:board/:grade/:subject", async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid route parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const grade = parsed.data.grade;
  const subjectRows = await learnRepository.findSubjectByRoute(parsed.data);
  const subjectRow = subjectRows[0] ?? null;

  if (!subjectRow) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const chapterRows = await learnRepository.findChaptersBySubject(subjectRow.subjectId);
  const patterns = await examPatternRepository.findSubjectPatternsByRoute(parsed.data);

  res.status(200).json(successResponse({
    board: {
      slug: subjectRow.boardSlug,
      name: subjectRow.boardName
    },
    grade,
    class: {
      slug: subjectRow.classSlug ?? grade,
      name: subjectRow.className ?? grade
    },
    subject: {
      id: subjectRow.subjectId,
      slug: subjectRow.subjectSlug,
      name: subjectRow.subjectName,
      description: subjectRow.subjectDescription ?? ""
    },
    chapters: chapterRows.map((chapter) => {
      const pattern = patterns?.chapters.find((item) => item.id === chapter.id);
      return {
        ...chapter,
        weightagePercentage: pattern?.weightagePercentage ?? 0,
        occurrenceCount: pattern?.occurrenceCount ?? 0,
        avgMarks: pattern?.avgMarks ?? 0,
        lastSeenYear: pattern?.lastSeenYear ?? null
      };
    }),
    recommendation: patterns?.recommendation ?? null
  }));
});

learnRouter.get("/:board/:grade/:subject/graph", requireSession, async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid route parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const { board, grade } = parsed.data;
  if (authedReq.session.user.role === "student") {
    if (authedReq.session.user.board && authedReq.session.user.board !== board) {
      res.status(403).json({
        error: "Forbidden"
      });
      return;
    }
    if (authedReq.session.user.class && authedReq.session.user.class !== grade) {
      res.status(403).json({
        error: "Forbidden"
      });
      return;
    }
  }

  const subjectRows = await learnRepository.findSubjectByRoute(parsed.data);
  const subjectRow = subjectRows[0] ?? null;
  if (!subjectRow) {
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  const graph = await listSubjectChapterGraph({ subjectId: subjectRow.subjectId, userId: authedReq.session.user.id });

  res.status(200).json({
    graph
  });
});

// ── Personalized Revision Notes ─────────────────────────────────────────────

const revisionPersonalizeParamsSchema = z.object({
  chapterId: z.coerce.number().int().positive()
});

learnRouter.post("/revision/:chapterId/personalize", requireSession, async (req, res) => {
  if (env.MISTRAL_API_KEY === "not-configured") {
    res.status(503).json(errorResponse("AI service is not configured", "AI_UNAVAILABLE"));
    return;
  }

  const parsed = revisionPersonalizeParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid chapter ID", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const { chapterId } = parsed.data;
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  // Load chapter info
  const chapterRows = await db
    .select({
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      chapterSummary: chapters.summary,
      grade: subjects.grade,
      subjectName: subjects.name,
      boardName: boards.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(chapters.id, chapterId))
    .limit(1);

  const chapterRow = chapterRows[0];
  if (!chapterRow) {
    res.status(404).json(errorResponse("Chapter not found", "NOT_FOUND"));
    return;
  }

  // Fetch revision notes, AI context, weak areas, and quiz attempts in parallel
  const [revisionNotesRow, aiCtx, adaptiveWeakAreas, chapterQuizAttempts, learningPath] = await Promise.all([
    learnRepository.findRevisionNotesByChapter(chapterId),
    aiContextRepository.findByUserId(userId),
    progressService.getAdaptiveWeakAreaLabels(userId, 5),
    db
      .select({
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
        completedAt: quizAttempts.completedAt
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(and(eq(quizAttempts.userId, userId), eq(quizzes.chapterId, chapterId)))
      .orderBy(desc(quizAttempts.completedAt))
      .limit(10),
    learningPathService.getLearningPath(userId, {
      boardSlug: authedReq.session.user.board ?? null,
      classSlug: authedReq.session.user.class ?? null
    })
  ]);

  const mergedWeakAreas = Array.from(new Set([...adaptiveWeakAreas, ...learningPath.studentWeakAreas])).slice(0, 5);

  // Build the prompt
  const existingNotesSummary: string[] = [];
  if (revisionNotesRow) {
    if (revisionNotesRow.keyFormulas.length > 0) {
      existingNotesSummary.push(`Key Formulas: ${revisionNotesRow.keyFormulas.join("; ")}`);
    }
    if (revisionNotesRow.keyDefinitions.length > 0) {
      const defs = revisionNotesRow.keyDefinitions.map((d) => `${d.term}: ${d.definition}`).join("; ");
      existingNotesSummary.push(`Key Definitions: ${defs}`);
    }
    if (revisionNotesRow.commonMistakes) {
      existingNotesSummary.push(`Common Mistakes: ${revisionNotesRow.commonMistakes}`);
    }
    if (revisionNotesRow.examTips) {
      existingNotesSummary.push(`Exam Tips: ${revisionNotesRow.examTips}`);
    }
  }

  const quizSummary = chapterQuizAttempts.length > 0
    ? chapterQuizAttempts.map((a) => `${a.score}/${a.totalMarks} (${Math.round((a.score / Math.max(a.totalMarks, 1)) * 100)}%)`).join(", ")
    : "No quiz attempts yet";

  const personalContextLines: string[] = [];
  if (aiCtx?.weakTopics && aiCtx.weakTopics.length > 0) {
    personalContextLines.push(`Weak topics from AI chat: ${aiCtx.weakTopics.join(", ")}`);
  }
  if (aiCtx?.strongTopics && aiCtx.strongTopics.length > 0) {
    personalContextLines.push(`Strong topics from AI chat: ${aiCtx.strongTopics.join(", ")}`);
  }
  if (mergedWeakAreas.length > 0) {
    personalContextLines.push(`Weak areas from quiz history: ${mergedWeakAreas.join(", ")}`);
  }

  const systemPrompt = [
    "You are an AI revision assistant for Pakistani 9th/10th grade students.",
    "Your task is to generate personalized revision tips based on the student's learning data.",
    "",
    "Output ONLY valid JSON matching this exact shape:",
    "{",
    '  "personalizedTips": ["tip1", "tip2", ...],',
    '  "focusAreas": ["area1", "area2", ...],',
    '  "strengthAreas": ["area1", "area2", ...]',
    "}",
    "",
    "Rules:",
    "- personalizedTips: 3-5 concise, actionable revision tips tailored to this student's weaknesses and the chapter content. Each tip should be 1-2 sentences.",
    "- focusAreas: 2-4 specific topics/concepts within this chapter that the student should focus on based on their weak areas and quiz performance.",
    "- strengthAreas: 1-3 topics the student is already strong in that they can leverage.",
    "- If there is no student data, give general revision tips for this chapter and leave strengthAreas empty.",
    "- Use simple English for a 14-16 year old student.",
    "- Do NOT include any text outside the JSON object.",
  ].join("\n");

  const userPrompt = [
    `Chapter: ${chapterRow.chapterTitle}`,
    `Subject: ${chapterRow.subjectName}`,
    `Board: ${chapterRow.boardName}`,
    `Grade: ${chapterRow.grade ?? "9"}`,
    "",
    existingNotesSummary.length > 0
      ? `Existing revision notes:\n${existingNotesSummary.join("\n")}`
      : "No existing revision notes for this chapter.",
    "",
    `Quiz attempts for this chapter: ${quizSummary}`,
    "",
    personalContextLines.length > 0
      ? `Student's personal learning context:\n${personalContextLines.join("\n")}`
      : "No personal learning data available yet.",
    "",
    "Generate personalized revision tips for this student and chapter."
  ].join("\n");

  try {
    const modelTier = "mistral-small" as const;
    const model = getMistralModel(modelTier);

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: "user" as const, content: userPrompt }] as ModelMessage[],
      maxOutputTokens: 1024,
      temperature: 0.6
    });

    const responseText = result.text.trim();

    // Extract JSON from the response (handle potential markdown code fences)
    let jsonText = responseText;
    const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch?.[1]) {
      jsonText = jsonBlockMatch[1].trim();
    }

    const responseSchema = z.object({
      personalizedTips: z.array(z.string()).min(1).max(8),
      focusAreas: z.array(z.string()).min(1).max(6),
      strengthAreas: z.array(z.string()).max(5)
    });

    const parsedResponse = responseSchema.safeParse(JSON.parse(jsonText));
    if (!parsedResponse.success) {
      logger.warn({ error: parsedResponse.error.flatten(), rawText: responseText }, "AI revision personalization returned invalid JSON shape");
      res.status(502).json(errorResponse("AI returned an unexpected response format", "AI_RESPONSE_INVALID"));
      return;
    }

    res.status(200).json(successResponse(parsedResponse.data));
  } catch (error) {
    logger.error({ error }, "AI revision personalization failed");
    res.status(502).json(errorResponse("Failed to generate personalized revision notes", "AI_GENERATION_FAILED"));
  }
});

learnRouter.get("/:board/:grade/:subject/:chapter", async (req, res) => {
  const parsed = chapterParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid route parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const { board, grade, subject, chapter } = parsed.data;

  const chapterRows = await learnRepository.findChapterBySlug({ board, grade, subject, chapter });
  const chapterRow = chapterRows[0] ?? null;
  if (!chapterRow) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const [chapterExercises, quizRows, chapterRevisionNotes, chapterSubparts] = await Promise.all([
    learnRepository.findExercisesByChapter(chapterRow.chapterId),
    learnRepository.findQuizByChapter(chapterRow.chapterId),
    learnRepository.findRevisionNotesByChapter(chapterRow.chapterId),
    learnRepository.findChapterSubparts(chapterRow.chapterId)
  ]);
  const chapterPattern = await examPatternRepository.findChapterPatternByRoute(parsed.data);

  const quizRow = quizRows[0] ?? null;
  let quiz = null;
  if (quizRow) {
    const quizQuestions = await learnRepository.findQuizQuestions(quizRow.id);
    quiz = { ...quizRow, questions: quizQuestions };
  }

  res.status(200).json(successResponse({
    board: {
      slug: chapterRow.boardSlug,
      name: chapterRow.boardName
    },
    grade,
    class: {
      slug: chapterRow.classSlug ?? grade,
      name: chapterRow.className ?? grade
    },
    subject: {
      id: chapterRow.subjectId,
      slug: chapterRow.subjectSlug,
      name: chapterRow.subjectName
    },
    chapter: {
      id: chapterRow.chapterId,
      chapterNumber: chapterRow.chapterNumber,
      title: chapterRow.chapterTitle,
      slug: chapterRow.chapterSlug,
      summary: chapterRow.chapterSummary ?? "",
      subparts: chapterSubparts,
      coverImageUrl: chapterRow.chapterCoverImageUrl,
      examWeightage: chapterPattern
        ? {
            occurrenceCount: chapterPattern.occurrenceCount,
            avgMarks: chapterPattern.avgMarks,
            lastSeenYear: chapterPattern.lastSeenYear,
            weightagePercentage: chapterPattern.weightagePercentage,
            analysisWindowYears: chapterPattern.analysisWindowYears
          }
        : null,
      revisionNotes: {
        keyFormulas: chapterRevisionNotes?.keyFormulas ?? [],
        keyDefinitions: chapterRevisionNotes?.keyDefinitions ?? [],
        commonMistakes: chapterRevisionNotes?.commonMistakes ?? "",
        examTips: chapterRevisionNotes?.examTips ?? ""
      }
    },
    exercises: chapterExercises,
    flashcards: [],
    quiz: quiz
  }));
});
