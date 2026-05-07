import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { errorResponse, successResponse, paginatedResponse } from "../lib/response.js";
import { pastPaperRepository } from "../repositories/past-paper.repository.js";
import { pastPaperService } from "../services/past-paper.service.js";
import { db } from "../lib/db/index.js";
import { boards } from "../lib/db/schema.js";

export const pastPapersRouter = Router();

const pastPaperListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  search: z.string().optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().optional()
});

// GET /api/past-papers — List published papers filtered by student's class & board
pastPapersRouter.get("/", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const user = authedReq.session.user;

    const userClass = user.class as string | undefined;
    const userBoard = user.board as string | undefined;

    if (!userClass || !userBoard) {
      res.status(400).json(errorResponse("Please complete your profile with class and board to access past papers.", "INCOMPLETE_PROFILE"));
      return;
    }

    const boardRows = await db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.slug, userBoard))
      .limit(1);

    const board = boardRows[0];
    if (!board) {
      res.status(400).json(errorResponse("Your selected board is not available.", "BOARD_NOT_FOUND"));
      return;
    }

    const parsed = pastPaperListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten()));
      return;
    }

    const listParams: {
      grade: string;
      boardId: number;
      page?: number;
      limit?: number;
      search?: string;
      subjectId?: number;
      year?: number;
    } = {
      grade: userClass,
      boardId: board.id,
      page: parsed.data.page,
      limit: parsed.data.limit
    };
    if (parsed.data.search !== undefined) listParams.search = parsed.data.search;
    if (parsed.data.subjectId !== undefined) listParams.subjectId = parsed.data.subjectId;
    if (parsed.data.year !== undefined) listParams.year = parsed.data.year;

    const result = await pastPaperRepository.listPublishedPapers(listParams);

    res.json(paginatedResponse(result.papers, result.pagination.page, result.pagination.limit, result.pagination.total));
  } catch (error) {
    console.error("Get past papers error:", error);
    res.status(500).json(errorResponse("Failed to fetch past papers", "FETCH_ERROR"));
  }
});

// GET /api/past-papers/:id/attempt/start
pastPapersRouter.get("/:id/attempt/start", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid paper ID", "VALIDATION_ERROR"));
      return;
    }

    const user = authedReq.session.user;
    const result = await pastPaperService.startAttempt(
      user.id,
      parsed.data.id,
      user.class as string | undefined,
      user.board as string | undefined
    );
    res.json(successResponse({
      attempt: result.attempt,
      exercises: result.exercises.map(e => ({
        id: e.id,
        exerciseNumber: e.exerciseNumber,
        question: e.question,
        type: e.type,
        difficulty: e.difficulty,
        options: e.options,
        blankCount: e.blanksAnswer?.length ?? 0,
        statements: e.statements?.map(s => ({ text: s.text, blankCount: s.blanksAnswer.length })) ?? null,
        problemMarkdown: e.problemMarkdown,
        orderIndex: e.orderIndex,
        marks: e.marks
      })),
      savedAnswers: result.savedAnswers
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "PAST_PAPER_NOT_FOUND") {
      res.status(404).json(errorResponse("Past paper not found", "NOT_FOUND"));
      return;
    }
    if (msg === "PAST_PAPER_NOT_AVAILABLE") {
      res.status(403).json(errorResponse("This paper is not available for your class or board", "ACCESS_DENIED"));
      return;
    }
    if (msg === "NO_EXERCISES_LINKED") {
      res.status(400).json(errorResponse("This paper has no exercises to attempt", "NO_EXERCISES"));
      return;
    }
    console.error("Start attempt error:", error);
    res.status(500).json(errorResponse("Failed to start attempt", "INTERNAL_ERROR"));
  }
});

// POST /api/past-papers/:id/attempt/save
pastPapersRouter.post("/:id/attempt/save", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const saveSchema = z.object({
      attemptId: z.string().uuid(),
      exerciseId: z.number().int().positive(),
      answer: z.unknown()
    });

    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid save payload", "VALIDATION_ERROR", parsed.error.flatten()));
      return;
    }

    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const pathParsed = paramsSchema.safeParse(req.params);
    if (!pathParsed.success) {
      res.status(400).json(errorResponse("Invalid paper ID", "VALIDATION_ERROR"));
      return;
    }

    await pastPaperService.saveAnswer(
      authedReq.session.user.id,
      parsed.data.attemptId,
      parsed.data.exerciseId,
      parsed.data.answer,
      pathParsed.data.id
    );

    res.json(successResponse({ saved: true }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "ATTEMPT_NOT_FOUND" || msg === "ATTEMPT_ALREADY_COMPLETED") {
      res.status(400).json(errorResponse(msg, "INVALID_STATE"));
      return;
    }
    console.error("Save answer error:", error);
    res.status(500).json(errorResponse("Failed to save answer", "INTERNAL_ERROR"));
  }
});

// POST /api/past-papers/:id/attempt/submit
pastPapersRouter.post("/:id/attempt/submit", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const submitSchema = z.object({
      attemptId: z.string().uuid(),
      timedOut: z.boolean().optional().default(false)
    });

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid submit payload", "VALIDATION_ERROR", parsed.error.flatten()));
      return;
    }

    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const pathParsed = paramsSchema.safeParse(req.params);
    if (!pathParsed.success) {
      res.status(400).json(errorResponse("Invalid paper ID", "VALIDATION_ERROR"));
      return;
    }

    const result = await pastPaperService.submitAttempt(
      authedReq.session.user.id,
      parsed.data.attemptId,
      parsed.data.timedOut ? "timed_out" : "submitted",
      pathParsed.data.id
    );
    res.json(successResponse(result));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "ATTEMPT_NOT_FOUND" || msg === "ATTEMPT_ALREADY_COMPLETED") {
      res.status(400).json(errorResponse(msg, "INVALID_STATE"));
      return;
    }
    console.error("Submit attempt error:", error);
    res.status(500).json(errorResponse("Failed to submit attempt", "INTERNAL_ERROR"));
  }
});

// GET /api/past-papers/:id/attempts
pastPapersRouter.get("/:id/attempts", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid paper ID", "VALIDATION_ERROR"));
      return;
    }

    const attempts = await pastPaperRepository.getUserAttempts(authedReq.session.user.id, parsed.data.id);
    res.json(successResponse({ attempts }));
  } catch (error) {
    console.error("Get attempts error:", error);
    res.status(500).json(errorResponse("Failed to fetch attempts", "FETCH_ERROR"));
  }
});

// GET /api/past-papers/:id/attempts/:attemptId
pastPapersRouter.get("/:id/attempts/:attemptId", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
      attemptId: z.string().uuid()
    });
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid parameters", "VALIDATION_ERROR"));
      return;
    }

    const data = await pastPaperRepository.getAttemptWithAnswers(parsed.data.attemptId, authedReq.session.user.id);
    if (!data) {
      res.status(404).json(errorResponse("Attempt not found", "NOT_FOUND"));
      return;
    }

    res.json(successResponse({
      attempt: data.attempt,
      answers: data.answers,
      exercises: data.exercises
    }));
  } catch (error) {
    console.error("Get attempt detail error:", error);
    res.status(500).json(errorResponse("Failed to fetch attempt detail", "FETCH_ERROR"));
  }
});
