import { Router } from "express";

import { notificationsAdminRouter } from "./notifications.js";
import { settingsAdminRouter } from "./settings.js";
import { moderationAdminRouter } from "./moderation.js";
import { usersAdminRouter } from "./users.js";
import { forumAdminRouter } from "./forum.js";
import { overviewAdminRouter } from "./overview.js";
import { auditLogsAdminRouter } from "./audit-logs.js";
import { jobsAdminRouter } from "./jobs.js";
import { cacheAdminRouter } from "./cache.js";
import { backupAdminRouter } from "./backup.js";

import { curriculumAdminRouter } from "./content/curriculum.js";
import { boardsAdminRouter } from "./content/boards.js";
import { classesAdminRouter } from "./content/classes.js";
import { subjectsAdminRouter } from "./content/subjects.js";
import { chaptersAdminRouter } from "./content/chapters.js";
import { exercisesAdminRouter } from "./content/exercises.js";
import { quizzesAdminRouter } from "./content/quizzes.js";
import { flashcardsAdminRouter } from "./content/flashcards.js";
import { formulasAdminRouter } from "./content/formulas.js";
import { quizQuestionsAdminRouter } from "./content/quiz-questions.js";
import { pastPapersAdminRouter } from "./content/past-papers.js";

export {
  curriculumExerciseCreateBodySchema,
  curriculumExerciseUpdateBodySchema,
} from "./content/exercises.js";

export const adminRouter = Router();

adminRouter.use(notificationsAdminRouter);
adminRouter.use(settingsAdminRouter);
adminRouter.use(moderationAdminRouter);
adminRouter.use(usersAdminRouter);
adminRouter.use(forumAdminRouter);
adminRouter.use(overviewAdminRouter);
adminRouter.use(auditLogsAdminRouter);
adminRouter.use(jobsAdminRouter);
adminRouter.use(cacheAdminRouter);
adminRouter.use(backupAdminRouter);

adminRouter.use(curriculumAdminRouter);
adminRouter.use(boardsAdminRouter);
adminRouter.use(classesAdminRouter);
adminRouter.use(subjectsAdminRouter);
adminRouter.use(chaptersAdminRouter);
adminRouter.use(exercisesAdminRouter);
adminRouter.use(quizzesAdminRouter);
adminRouter.use(flashcardsAdminRouter);
adminRouter.use(formulasAdminRouter);
adminRouter.use(quizQuestionsAdminRouter);
adminRouter.use(pastPapersAdminRouter);
