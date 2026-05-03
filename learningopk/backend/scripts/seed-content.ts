import { createHash } from "node:crypto";
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db, pool } from "../src/lib/db/index.js";
import { boards, chapters, contentSources, exercises, flashcards, quizQuestions, quizzes, subjects } from "../src/lib/db/schema.js";

const parserVersion = "v1.0.0";

const cliSchema = z.object({
  board: z.string().trim().min(1).optional(),
  grade: z.enum(["9", "10"]).optional(),
  subject: z.string().trim().min(1).optional(),
  dryRun: z.boolean().default(false)
});

const quizQuestionSchema = z.object({
  question: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().trim().min(1),
  marks: z.number().int().positive().default(1)
});

const chapterSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  isPublished: z.boolean().optional().default(true),
  exercises: z
    .array(
      z.object({
        exerciseNumber: z.string().trim().min(1),
        question: z.string().trim().min(1),
        solution: z.string().trim().min(1),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]).default("short"),
        blanksAnswer: z.array(z.string()).optional(),
        statements: z.array(z.object({
          text: z.string().trim().min(1),
          blanksAnswer: z.array(z.string().trim().min(1)).min(1)
        })).optional()
      })
    )
    .default([]),
  flashcards: z
    .array(
      z.object({
        front: z.string().trim().min(1),
        back: z.string().trim().min(1)
      })
    )
    .default([]),
  quiz: z
    .object({
      title: z.string().trim().min(1),
      durationMinutes: z.number().int().positive().default(30),
      totalMarks: z.number().int().positive().optional(),
      questions: z.array(quizQuestionSchema).min(1)
    })
    .optional()
});

const sourceSchema = z.object({
  board: z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1)
  }),
  grade: z.enum(["9", "10"]),
  subject: z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    description: z.string().trim().optional().default("")
  }),
  chapters: z.array(chapterSchema).min(1)
});

type CliOptions = z.infer<typeof cliSchema>;
type SeedSource = z.infer<typeof sourceSchema>;

type Pass1File = {
  absolutePath: string;
  fileName: string;
  rawText: string;
  normalizedText: string;
  fileHash: string;
  data: unknown;
};

type Pass2File = Pass1File & {
  source: SeedSource;
};

type ParseSummary = {
  filesScanned: number;
  filesParsed: number;
  filesMatched: number;
  chapters: number;
  exercises: number;
  flashcards: number;
  quizzes: number;
  quizQuestions: number;
  warnings: string[];
};

type WriteSummary = {
  filesInserted: number;
  filesSkipped: number;
  boardsInserted: number;
  subjectsInserted: number;
  contentSourcesInserted: number;
  chaptersInserted: number;
  chaptersUpdated: number;
  exercisesInserted: number;
  exercisesUpdated: number;
  flashcardsInserted: number;
  quizzesInserted: number;
  quizQuestionsInserted: number;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const seedDataDir = path.join(scriptDir, "seed-data");
const seedReportPath = path.join(scriptDir, "seed-report.json");

const parseCliArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const parsed: { board?: string; grade?: string; subject?: string; dryRun?: boolean } = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current || current === "--" || !current.startsWith("--")) {
      continue;
    }

    const withoutPrefix = current.slice(2);
    const [flag, valueFromEquals] = withoutPrefix.split("=");

    if (flag === "dry-run") {
      parsed.dryRun = true;
      continue;
    }

    const nextValue = valueFromEquals ?? args[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for --${flag}`);
    }

    if (!valueFromEquals) {
      index += 1;
    }

    if (flag === "board") {
      parsed.board = nextValue;
    } else if (flag === "grade") {
      parsed.grade = nextValue;
    } else if (flag === "subject") {
      parsed.subject = nextValue;
    }
  }

  return cliSchema.parse({
    board: parsed.board,
    grade: parsed.grade,
    subject: parsed.subject,
    dryRun: parsed.dryRun ?? false
  });
};

const normalizeText = (value: string): string => value.replace(/\r\n/g, "\n").trim();

const deepNormalize = (value: unknown): unknown => {
  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepNormalize(entry));
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const normalizedEntries = Object.entries(objectValue).map(([key, entry]) => [key, deepNormalize(entry)]);
    return Object.fromEntries(normalizedEntries);
  }

  return value;
};

const runPass1 = async (): Promise<Pass1File[]> => {
  try {
    await access(seedDataDir);
  } catch {
    return [];
  }
  const entries = await readdir(seedDataDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"));

  const pass1Files: Pass1File[] = [];
  for (const file of files) {
    const absolutePath = path.join(seedDataDir, file.name);
    const rawText = await readFile(absolutePath, "utf8");
    const normalizedText = normalizeText(rawText);
    const fileHash = createHash("sha256").update(rawText).digest("hex");
    const jsonValue = JSON.parse(normalizedText) as unknown;

    pass1Files.push({
      absolutePath,
      fileName: file.name,
      rawText,
      normalizedText,
      fileHash,
      data: deepNormalize(jsonValue)
    });
  }

  return pass1Files;
};

const matchesFilters = (source: SeedSource, options: CliOptions): boolean => {
  if (options.board && source.board.slug.toLowerCase() !== options.board.toLowerCase()) {
    return false;
  }

  if (options.grade && source.grade !== options.grade) {
    return false;
  }

  if (options.subject && source.subject.slug.toLowerCase() !== options.subject.toLowerCase()) {
    return false;
  }

  return true;
};

const runPass2 = (files: Pass1File[], options: CliOptions): { parsedFiles: Pass2File[]; summary: ParseSummary } => {
  const summary: ParseSummary = {
    filesScanned: files.length,
    filesParsed: 0,
    filesMatched: 0,
    chapters: 0,
    exercises: 0,
    flashcards: 0,
    quizzes: 0,
    quizQuestions: 0,
    warnings: []
  };

  const parsedFiles: Pass2File[] = [];

  for (const file of files) {
    const parsed = sourceSchema.safeParse(file.data);
    if (!parsed.success) {
      summary.warnings.push(`Parse warning in ${file.fileName}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
      continue;
    }

    summary.filesParsed += 1;
    const source = parsed.data;

    if (!matchesFilters(source, options)) {
      continue;
    }

    summary.filesMatched += 1;
    summary.chapters += source.chapters.length;
    summary.exercises += source.chapters.reduce((total, chapter) => total + chapter.exercises.length, 0);
    summary.flashcards += source.chapters.reduce((total, chapter) => total + chapter.flashcards.length, 0);
    summary.quizzes += source.chapters.reduce((total, chapter) => total + (chapter.quiz ? 1 : 0), 0);
    summary.quizQuestions += source.chapters.reduce(
      (total, chapter) => total + (chapter.quiz ? chapter.quiz.questions.length : 0),
      0
    );

    parsedFiles.push({
      ...file,
      source
    });
  }

  return {
    parsedFiles,
    summary
  };
};

const ensureBoard = async (name: string, slug: string): Promise<{ id: number; inserted: boolean }> => {
  const existing = await db.query.boards.findFirst({
    where: eq(boards.slug, slug),
    columns: {
      id: true
    }
  });

  if (existing) {
    return { id: existing.id, inserted: false };
  }

  const [created] = await db
    .insert(boards)
    .values({
      name,
      slug
    })
    .returning({
      id: boards.id
    });

  if (!created) {
    throw new Error(`Failed to create board ${slug}`);
  }

  return { id: created.id, inserted: true };
};

const ensureSubject = async (input: {
  boardId: number;
  grade: "9" | "10";
  name: string;
  slug: string;
  description: string;
}): Promise<{ id: number; inserted: boolean }> => {
  const existing = await db.query.subjects.findFirst({
    where: and(eq(subjects.boardId, input.boardId), eq(subjects.grade, input.grade), eq(subjects.slug, input.slug)),
    columns: {
      id: true
    }
  });

  if (existing) {
    return { id: existing.id, inserted: false };
  }

  const [created] = await db
    .insert(subjects)
    .values({
      boardId: input.boardId,
      grade: input.grade,
      name: input.name,
      slug: input.slug,
      description: input.description || null
    })
    .returning({
      id: subjects.id
    });

  if (!created) {
    throw new Error(`Failed to create subject ${input.slug}`);
  }

  return { id: created.id, inserted: true };
};

const seedParsedFiles = async (parsedFiles: Pass2File[]): Promise<WriteSummary> => {
  const summary: WriteSummary = {
    filesInserted: 0,
    filesSkipped: 0,
    boardsInserted: 0,
    subjectsInserted: 0,
    contentSourcesInserted: 0,
    chaptersInserted: 0,
    chaptersUpdated: 0,
    exercisesInserted: 0,
    exercisesUpdated: 0,
    flashcardsInserted: 0,
    quizzesInserted: 0,
    quizQuestionsInserted: 0
  };

  for (const parsedFile of parsedFiles) {
    const { source } = parsedFile;

    const boardResult = await ensureBoard(source.board.name, source.board.slug);
    if (boardResult.inserted) {
      summary.boardsInserted += 1;
    }

    const subjectResult = await ensureSubject({
      boardId: boardResult.id,
      grade: source.grade,
      name: source.subject.name,
      slug: source.subject.slug,
      description: source.subject.description
    });
    if (subjectResult.inserted) {
      summary.subjectsInserted += 1;
    }

    const existingSource = await db.query.contentSources.findFirst({
      where: and(eq(contentSources.subjectId, subjectResult.id), eq(contentSources.fileHash, parsedFile.fileHash)),
      columns: {
        id: true
      }
    });

    if (existingSource) {
      summary.filesSkipped += 1;
      continue;
    }

    const [createdSource] = await db
      .insert(contentSources)
      .values({
        boardId: boardResult.id,
        grade: source.grade,
        subjectId: subjectResult.id,
        fileName: parsedFile.fileName,
        fileHash: parsedFile.fileHash,
        parserVersion
      })
      .returning({
        id: contentSources.id
      });

    if (!createdSource) {
      throw new Error(`Failed to create content source for ${parsedFile.fileName}`);
    }

    summary.filesInserted += 1;
    summary.contentSourcesInserted += 1;

    for (const chapter of source.chapters) {
      const existingChapter = await db.query.chapters.findFirst({
        where: and(eq(chapters.subjectId, subjectResult.id), eq(chapters.slug, chapter.slug)),
        columns: {
          id: true
        }
      });

      let chapterId: number;
      if (!existingChapter) {
        const [createdChapter] = await db
          .insert(chapters)
          .values({
            subjectId: subjectResult.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            slug: chapter.slug,
            summary: chapter.summary,
            isPublished: chapter.isPublished,
            sourceId: createdSource.id
          })
          .returning({
            id: chapters.id
          });

        if (!createdChapter) {
          throw new Error(`Failed to create chapter ${chapter.slug}`);
        }

        chapterId = createdChapter.id;
        summary.chaptersInserted += 1;
      } else {
        await db
          .update(chapters)
          .set({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            summary: chapter.summary,
            isPublished: chapter.isPublished,
            sourceId: createdSource.id
          })
          .where(eq(chapters.id, existingChapter.id));
        chapterId = existingChapter.id;
        summary.chaptersUpdated += 1;
      }

      for (const exercise of chapter.exercises) {
        const existingExercise = await db.query.exercises.findFirst({
          where: and(eq(exercises.chapterId, chapterId), eq(exercises.exerciseNumber, exercise.exerciseNumber)),
          columns: {
            id: true
          }
        });

        if (!existingExercise) {
          await db.insert(exercises).values({
            chapterId,
            exerciseNumber: exercise.exerciseNumber,
            question: exercise.question,
            solution: exercise.solution,
            difficulty: exercise.difficulty,
            type: exercise.type,
            sourceId: createdSource.id,
            blanksAnswer: exercise.type === "fill_in_blanks" ? (exercise.blanksAnswer ?? null) : null,
            statements: exercise.type === "fill_in_blanks" ? (exercise.statements ?? null) : null
          });
          summary.exercisesInserted += 1;
        } else {
          await db
            .update(exercises)
            .set({
              question: exercise.question,
              solution: exercise.solution,
              difficulty: exercise.difficulty,
              type: exercise.type,
              sourceId: createdSource.id,
              blanksAnswer: exercise.type === "fill_in_blanks" ? (exercise.blanksAnswer ?? null) : null,
              statements: exercise.type === "fill_in_blanks" ? (exercise.statements ?? null) : null
            })
            .where(eq(exercises.id, existingExercise.id));
          summary.exercisesUpdated += 1;
        }
      }

      await db.delete(flashcards).where(eq(flashcards.chapterId, chapterId));
      if (chapter.flashcards.length > 0) {
        await db.insert(flashcards).values(
          chapter.flashcards.map((card, index) => ({
            chapterId,
            front: card.front,
            back: card.back,
            orderIndex: index + 1
          }))
        );
        summary.flashcardsInserted += chapter.flashcards.length;
      }

      await db.delete(quizzes).where(eq(quizzes.chapterId, chapterId));
      if (chapter.quiz) {
        const quizTotalMarks = chapter.quiz.totalMarks ?? chapter.quiz.questions.reduce((total, question) => total + question.marks, 0);
        const [createdQuiz] = await db
          .insert(quizzes)
          .values({
            chapterId,
            title: chapter.quiz.title,
            durationMinutes: chapter.quiz.durationMinutes,
            totalMarks: quizTotalMarks,
            type: "chapter_quiz"
          })
          .returning({
            id: quizzes.id
          });

        if (!createdQuiz) {
          throw new Error(`Failed to create quiz for chapter ${chapter.slug}`);
        }

        summary.quizzesInserted += 1;
        await db.insert(quizQuestions).values(
          chapter.quiz.questions.map((question) => ({
            quizId: createdQuiz.id,
            question: question.question,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            correctOption: question.correctOption,
            explanation: question.explanation,
            marks: question.marks
          }))
        );
        summary.quizQuestionsInserted += chapter.quiz.questions.length;
      }
    }
  }

  return summary;
};

const printParseSummary = (summary: ParseSummary, options: CliOptions): void => {
  console.log("Seeder parser version:", parserVersion);
  console.log("Mode:", options.dryRun ? "dry-run" : "write");
  console.log("Filters:", {
    board: options.board ?? "*",
    grade: options.grade ?? "*",
    subject: options.subject ?? "*"
  });
  console.log("Pass summary:", {
    filesScanned: summary.filesScanned,
    filesParsed: summary.filesParsed,
    filesMatched: summary.filesMatched,
    chapters: summary.chapters,
    exercises: summary.exercises,
    flashcards: summary.flashcards,
    quizzes: summary.quizzes,
    quizQuestions: summary.quizQuestions,
    warningCount: summary.warnings.length
  });

  if (summary.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }
};

const writeSeedReport = async (payload: {
  options: CliOptions;
  parseSummary: ParseSummary;
  writeSummary: WriteSummary;
}): Promise<void> => {
  const report = {
    generatedAt: new Date().toISOString(),
    parserVersion,
    dryRun: payload.options.dryRun,
    filters: {
      board: payload.options.board ?? "*",
      grade: payload.options.grade ?? "*",
      subject: payload.options.subject ?? "*"
    },
    parseSummary: {
      filesScanned: payload.parseSummary.filesScanned,
      filesParsed: payload.parseSummary.filesParsed,
      filesMatched: payload.parseSummary.filesMatched,
      chapters: payload.parseSummary.chapters,
      exercises: payload.parseSummary.exercises,
      flashcards: payload.parseSummary.flashcards,
      quizzes: payload.parseSummary.quizzes,
      quizQuestions: payload.parseSummary.quizQuestions
    },
    inserted: {
      files: payload.writeSummary.filesInserted,
      boards: payload.writeSummary.boardsInserted,
      subjects: payload.writeSummary.subjectsInserted,
      contentSources: payload.writeSummary.contentSourcesInserted,
      chapters: payload.writeSummary.chaptersInserted,
      exercises: payload.writeSummary.exercisesInserted,
      flashcards: payload.writeSummary.flashcardsInserted,
      quizzes: payload.writeSummary.quizzesInserted,
      quizQuestions: payload.writeSummary.quizQuestionsInserted
    },
    skipped: {
      files: payload.writeSummary.filesSkipped
    },
    warnings: payload.parseSummary.warnings,
    warningCount: payload.parseSummary.warnings.length
  };

  await writeFile(seedReportPath, JSON.stringify(report, null, 2), "utf8");
};

const run = async (): Promise<void> => {
  const options = parseCliArgs();
  const pass1Files = await runPass1();
  const { parsedFiles, summary } = runPass2(pass1Files, options);

  printParseSummary(summary, options);

  let writeSummary: WriteSummary = {
    filesInserted: 0,
    filesSkipped: 0,
    boardsInserted: 0,
    subjectsInserted: 0,
    contentSourcesInserted: 0,
    chaptersInserted: 0,
    chaptersUpdated: 0,
    exercisesInserted: 0,
    exercisesUpdated: 0,
    flashcardsInserted: 0,
    quizzesInserted: 0,
    quizQuestionsInserted: 0
  };

  if (options.dryRun) {
    await writeSeedReport({
      options,
      parseSummary: summary,
      writeSummary
    });
    console.log(`Seed report written to ${seedReportPath}`);
    console.log("Dry run completed. No database writes were executed.");
    return;
  }

  writeSummary = await seedParsedFiles(parsedFiles);
  await writeSeedReport({
    options,
    parseSummary: summary,
    writeSummary
  });
  console.log(`Seed report written to ${seedReportPath}`);
  console.log("Write summary:", writeSummary);
};

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown seeding error";
  console.error("Seeding failed:", message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
