import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./src/lib/db/schema.js";
import { clearDatabase } from "./src/lib/db/clear-database.js";
import {
  accounts,
  adminAuditLogs,
  adminNotifications,
  adminSettings,
  aiChatSessions,
  aiContext,
  aiConversationEvents,
  aiMessages,
  aiUsageLogs,
  boardClasses,
  boards,
  chapterSubparts,
  chapters,
  contentSources,
  examAnalysis,
  exercises,
  flashcardReviews,
  flashcards,
  formulaAccessEvents,
  formulas,
  forumReplies,
  forumReplyVotes,
  forumThreads,
  moderationFlags,
  mockExams,
  quizAttempts,
  quizDuelChallenges,
  quizQuestions,
  quizzes,
  revisionNotes,
  streakWagers,
  subjects,
  userDailyMomentumGoals,
  userProgress,
  userProgressSubparts,
  users,
  userStarredFormulas
} from "./src/lib/db/schema.js";
import {
  studyGroupActivities,
  studyGroupMembers,
  studyGroups
} from "./src/lib/db/study-groups-schema.js";

config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/learningo"
});

const db = drizzle(pool, { schema });

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

const daysAgo = (days: number, hour = 8): Date =>
  new Date(now.getTime() - days * dayMs + hour * 60 * 60 * 1000);

const daysAhead = (days: number, hour = 9): Date =>
  new Date(now.getTime() + days * dayMs + hour * 60 * 60 * 1000);

async function seed() {
  console.log("Seeding current-feature database...");
  await clearDatabase(db);
  console.log("Cleared existing data");

  const [fbiseBoard, lahoreBoard] = await db
    .insert(boards)
    .values([
      { name: "Federal Board (FBISE)", slug: "fbise" },
      { name: "BISE Lahore", slug: "bise-lahore" }
    ])
    .returning();

  const [fbise9, fbise10, lahore9] = await db
    .insert(boardClasses)
    .values([
      { boardId: fbiseBoard.id, name: "9th", slug: "9" },
      { boardId: fbiseBoard.id, name: "10th", slug: "10" },
      { boardId: lahoreBoard.id, name: "9th", slug: "9" }
    ])
    .returning();

  const [physics9, chemistry9, biology10, math9] = await db
    .insert(subjects)
    .values([
      {
        boardId: fbiseBoard.id,
        boardClassId: fbise9.id,
        grade: "9",
        name: "Physics",
        slug: "physics",
        icon: "physics",
        description: "Conceptual physics with quizzes, quick revision, and exam pattern guidance.",
        examDate: daysAhead(18)
      },
      {
        boardId: fbiseBoard.id,
        boardClassId: fbise9.id,
        grade: "9",
        name: "Chemistry",
        slug: "chemistry",
        icon: "chemistry",
        description: "Core chemistry concepts for grade 9 board prep.",
        examDate: daysAhead(24)
      },
      {
        boardId: fbiseBoard.id,
        boardClassId: fbise10.id,
        grade: "10",
        name: "Biology",
        slug: "biology",
        icon: "biology",
        description: "Grade 10 biology content for dashboard and chapter routing coverage.",
        examDate: daysAhead(30)
      },
      {
        boardId: lahoreBoard.id,
        boardClassId: lahore9.id,
        grade: "9",
        name: "Mathematics",
        slug: "mathematics",
        icon: "mathematics",
        description: "Lahore board mathematics content for board-scoped listings.",
        examDate: daysAhead(27)
      }
    ])
    .returning();

  const [physicsSource, chemistrySource] = await db
    .insert(contentSources)
    .values([
      {
        boardId: fbiseBoard.id,
        grade: "9",
        subjectId: physics9.id,
        fileName: "fbise-9-physics-modern-seed.pdf",
        fileHash: "seed-physics-9-v2",
        parserVersion: "seed-v2"
      },
      {
        boardId: fbiseBoard.id,
        grade: "9",
        subjectId: chemistry9.id,
        fileName: "fbise-9-chemistry-modern-seed.pdf",
        fileHash: "seed-chemistry-9-v2",
        parserVersion: "seed-v2"
      }
    ])
    .returning();

  const [physicsCh1, physicsCh2, physicsCh3, chemistryCh1, biologyCh1, mathCh1] = await db
    .insert(chapters)
    .values([
      {
        subjectId: physics9.id,
        chapterNumber: 1,
        title: "Physical Quantities and Measurement",
        slug: "physical-quantities-and-measurement",
        summary: "Units, significant figures, measuring tools, and precision fundamentals.",
        isPublished: true,
        sourceId: physicsSource.id
      },
      {
        subjectId: physics9.id,
        chapterNumber: 2,
        title: "Kinematics",
        slug: "kinematics",
        summary: "Distance, displacement, speed, velocity, acceleration, and motion graphs.",
        isPublished: true,
        sourceId: physicsSource.id
      },
      {
        subjectId: physics9.id,
        chapterNumber: 3,
        title: "Dynamics",
        slug: "dynamics",
        summary: "Force, inertia, momentum, and Newton's laws in everyday motion.",
        isPublished: true,
        sourceId: physicsSource.id
      },
      {
        subjectId: chemistry9.id,
        chapterNumber: 1,
        title: "Fundamentals of Chemistry",
        slug: "fundamentals-of-chemistry",
        summary: "Atoms, compounds, mixtures, and symbolic representation.",
        isPublished: true,
        sourceId: chemistrySource.id
      },
      {
        subjectId: biology10.id,
        chapterNumber: 1,
        title: "Gaseous Exchange",
        slug: "gaseous-exchange",
        summary: "Human and plant gas exchange systems with board-style examples.",
        isPublished: true,
        sourceId: null
      },
      {
        subjectId: math9.id,
        chapterNumber: 1,
        title: "Matrices and Determinants",
        slug: "matrices-and-determinants",
        summary: "Introduction to matrices, determinants, and basic operations.",
        isPublished: true,
        sourceId: null
      }
    ])
    .returning();

  const chapterSubpartsByChapterId = new Map<number, number[]>();
  const insertedChapterSubparts = await db
    .insert(chapterSubparts)
    .values([
      {
        chapterId: physicsCh1.id,
        orderIndex: 1,
        heading: "Physical quantities and SI units",
        content: "Physical quantities are measurable properties. Use SI units consistently in numerical solutions."
      },
      {
        chapterId: physicsCh1.id,
        orderIndex: 2,
        heading: "Accuracy, precision, and measurement error",
        content: "Accuracy compares with the true value, while precision measures repeatability. Track absolute and percentage error."
      },
      {
        chapterId: physicsCh1.id,
        orderIndex: 3,
        heading: "Significant figures and scientific notation",
        content: "Keep the correct significant figures through calculations and present final answers in standard scientific notation."
      },
      {
        chapterId: physicsCh2.id,
        orderIndex: 1,
        heading: "Distance and displacement",
        content: "Distance is scalar and displacement is vector. Always set direction before solving motion problems."
      },
      {
        chapterId: physicsCh2.id,
        orderIndex: 2,
        heading: "Velocity and acceleration",
        content: "Use sign convention consistently for velocity and acceleration, especially in retardation cases."
      },
      {
        chapterId: physicsCh2.id,
        orderIndex: 3,
        heading: "Equations of motion and graph interpretation",
        content: "Apply equations of motion only for constant acceleration and read slope/area correctly from motion graphs."
      },
      {
        chapterId: physicsCh3.id,
        orderIndex: 1,
        heading: "Force and Newton's laws",
        content: "Newton's laws connect force, inertia, and acceleration. Start free-body analysis before equations."
      },
      {
        chapterId: physicsCh3.id,
        orderIndex: 2,
        heading: "Momentum and impulse",
        content: "Momentum depends on mass and velocity. Impulse changes momentum over interaction time."
      },
      {
        chapterId: chemistryCh1.id,
        orderIndex: 1,
        heading: "Atoms, molecules, elements, and compounds",
        content: "Differentiate element vs compound clearly and support each definition with one textbook example."
      },
      {
        chapterId: chemistryCh1.id,
        orderIndex: 2,
        heading: "Mixtures and separation",
        content: "Identify mixture types and choose suitable separation methods based on physical properties."
      },
      {
        chapterId: biologyCh1.id,
        orderIndex: 1,
        heading: "Human respiratory system",
        content: "Air pathway and gas exchange occur through alveoli with diffusion driven by concentration differences."
      },
      {
        chapterId: biologyCh1.id,
        orderIndex: 2,
        heading: "Plant gaseous exchange",
        content: "Plants exchange gases through stomata, with rates changing between day and night conditions."
      },
      {
        chapterId: mathCh1.id,
        orderIndex: 1,
        heading: "Matrix basics",
        content: "Represent data in rows and columns, then classify matrices by order and type."
      },
      {
        chapterId: mathCh1.id,
        orderIndex: 2,
        heading: "Determinants and properties",
        content: "Use determinant properties to simplify calculation and verify singular vs non-singular matrices."
      }
    ])
    .returning({
      id: chapterSubparts.id,
      chapterId: chapterSubparts.chapterId
    });

  for (const subpart of insertedChapterSubparts) {
    const existing = chapterSubpartsByChapterId.get(subpart.chapterId) ?? [];
    existing.push(subpart.id);
    chapterSubpartsByChapterId.set(subpart.chapterId, existing);
  }

  const physicsCh1SubpartIds = chapterSubpartsByChapterId.get(physicsCh1.id) ?? [];
  const physicsCh2SubpartIds = chapterSubpartsByChapterId.get(physicsCh2.id) ?? [];
  const physicsCh3SubpartIds = chapterSubpartsByChapterId.get(physicsCh3.id) ?? [];
  const biologyCh1SubpartIds = chapterSubpartsByChapterId.get(biologyCh1.id) ?? [];

  await db.insert(revisionNotes).values([
    {
      chapterId: physicsCh1.id,
      keyFormulas: ["Least\\ Count = \\frac{1\\ MSD}{\\text{number of vernier divisions}}", "Error\\% = \\frac{\\Delta x}{x} \\times 100"],
      keyDefinitions: [
        { term: "Accuracy", definition: "Closeness of a measured value to the true value." },
        { term: "Precision", definition: "How consistently repeated measurements agree with each other." }
      ],
      commonMistakes: "Confusing accuracy with precision\nDropping significant zeros in final answers",
      examTips: "Always write the SI unit with the answer\nMention least count before instrument-based calculations"
    },
    {
      chapterId: physicsCh2.id,
      keyFormulas: ["v = u + at", "s = ut + \\frac{1}{2}at^2", "v^2 = u^2 + 2as"],
      keyDefinitions: [
        { term: "Displacement", definition: "Shortest directed distance between starting and ending point." },
        { term: "Acceleration", definition: "Rate of change of velocity with time." }
      ],
      commonMistakes: "Using speed where velocity is required\nForgetting sign conventions in retardation problems",
      examTips: "Pick a positive direction first\nRead graph axes carefully before taking slope or area"
    },
    {
      chapterId: chemistryCh1.id,
      keyFormulas: [],
      keyDefinitions: [
        { term: "Atom", definition: "Smallest particle of an element that retains its identity." }
      ],
      commonMistakes: "Mixing up atoms, molecules, and ions",
      examTips: "State one example whenever you define an element or compound"
    }
  ]);

  await db.insert(exercises).values([
    {
      chapterId: physicsCh1.id,
      exerciseNumber: "1.1",
      question: "Define physical quantities and write two examples.",
      solution: "Physical quantities are measurable properties such as length and mass.",
      difficulty: "easy",
      type: "short"
    },
    {
      chapterId: physicsCh1.id,
      exerciseNumber: "1.2",
      question: "A screw gauge has pitch 1 mm and 100 divisions. Find its least count.",
      solution: "Least count = 1 mm / 100 = 0.01 mm.",
      difficulty: "medium",
      type: "numerical"
    },
    {
      chapterId: physicsCh2.id,
      exerciseNumber: "2.1",
      question: "Differentiate between distance and displacement.",
      solution: "Distance is scalar path length while displacement is the directed shortest path.",
      difficulty: "easy",
      type: "short"
    },
    {
      chapterId: physicsCh2.id,
      exerciseNumber: "2.2",
      question: "A car starts from rest with acceleration 2 m/s^2. Find velocity after 5 s.",
      solution: "Using v = u + at, velocity = 0 + 2 x 5 = 10 m/s.",
      difficulty: "medium",
      type: "numerical"
    },
    {
      chapterId: physicsCh3.id,
      exerciseNumber: "3.1",
      question: "State Newton's second law of motion.",
      solution: "Force equals rate of change of momentum and acts in that direction.",
      difficulty: "easy",
      type: "short"
    },
    {
      chapterId: chemistryCh1.id,
      exerciseNumber: "1.1",
      question: "What is the difference between an element and a compound?",
      solution: "An element has one type of atom; a compound has two or more elements chemically combined.",
      difficulty: "easy",
      type: "short"
    }
  ]);

  const [p1f1, p1f2, p1f3, p2f1, p2f2, p3f1, c1f1, c1f2] = await db
    .insert(flashcards)
    .values([
      { chapterId: physicsCh1.id, front: "What is a physical quantity?", back: "A measurable property of nature.", orderIndex: 1 },
      { chapterId: physicsCh1.id, front: "Define least count.", back: "The smallest reading an instrument can reliably measure.", orderIndex: 2 },
      { chapterId: physicsCh1.id, front: "What are significant figures?", back: "Digits that carry meaning in a measured value.", orderIndex: 3 },
      { chapterId: physicsCh2.id, front: "Write the first equation of motion.", back: "v = u + at", orderIndex: 1 },
      { chapterId: physicsCh2.id, front: "Displacement is scalar or vector?", back: "Vector quantity.", orderIndex: 2 },
      { chapterId: physicsCh3.id, front: "State Newton's third law.", back: "For every action there is an equal and opposite reaction.", orderIndex: 1 },
      { chapterId: chemistryCh1.id, front: "What is an atom?", back: "The smallest unit of an element.", orderIndex: 1 },
      { chapterId: chemistryCh1.id, front: "What is a compound?", back: "A pure substance made from chemically combined elements.", orderIndex: 2 }
    ])
    .returning();

  const [physicsQuiz1, physicsQuiz2, physicsQuiz3, chemistryQuiz1, mockQuiz2023, mockQuiz2024] = await db
    .insert(quizzes)
    .values([
      { chapterId: physicsCh1.id, title: "Chapter 1 Quiz - Measurement", durationMinutes: 20, totalMarks: 4, type: "chapter_quiz" },
      { chapterId: physicsCh2.id, title: "Chapter 2 Quiz - Kinematics", durationMinutes: 20, totalMarks: 4, type: "chapter_quiz" },
      { chapterId: physicsCh3.id, title: "Chapter 3 Quiz - Dynamics", durationMinutes: 20, totalMarks: 4, type: "chapter_quiz" },
      { chapterId: chemistryCh1.id, title: "Chapter 1 Quiz - Fundamentals", durationMinutes: 15, totalMarks: 3, type: "chapter_quiz" },
      { chapterId: physicsCh2.id, title: "Physics Grade 9 Mock Exam 2023", durationMinutes: 90, totalMarks: 6, type: "mock_exam" },
      { chapterId: physicsCh3.id, title: "Physics Grade 9 Mock Exam 2024", durationMinutes: 90, totalMarks: 6, type: "mock_exam" }
    ])
    .returning();

  const [q1a, q1b, q1c, q1d, q2a, q2b, q2c, q2d] = await db
    .insert(quizQuestions)
    .values([
      {
        quizId: physicsQuiz1.id,
        chapterId: physicsCh1.id,
        question: "Which is a base SI unit?",
        optionA: "Newton",
        optionB: "Kilogram",
        optionC: "Joule",
        optionD: "Watt",
        correctOption: "b",
        explanation: "Kilogram is a base SI unit.",
        marks: 1
      },
      {
        quizId: physicsQuiz1.id,
        chapterId: physicsCh1.id,
        question: "Least count of a standard vernier caliper is usually:",
        optionA: "1 mm",
        optionB: "0.5 mm",
        optionC: "0.1 mm",
        optionD: "0.01 m",
        correctOption: "c",
        explanation: "Standard vernier caliper least count is 0.1 mm.",
        marks: 1
      },
      {
        quizId: physicsQuiz1.id,
        chapterId: physicsCh1.id,
        question: "Accuracy means:",
        optionA: "Closeness to the true value",
        optionB: "Repeating the same mistake",
        optionC: "Using more digits",
        optionD: "Reading in meters only",
        correctOption: "a",
        explanation: "Accuracy is closeness to the true value.",
        marks: 1
      },
      {
        quizId: physicsQuiz1.id,
        chapterId: physicsCh1.id,
        question: "Which error is caused by a wrong zero setting?",
        optionA: "Random error",
        optionB: "Systematic error",
        optionC: "Human memory error",
        optionD: "No error",
        correctOption: "b",
        explanation: "Zero error is systematic.",
        marks: 1
      },
      {
        quizId: physicsQuiz2.id,
        chapterId: physicsCh2.id,
        question: "Displacement is a:",
        optionA: "Scalar quantity",
        optionB: "Vector quantity",
        optionC: "Unit",
        optionD: "Graph",
        correctOption: "b",
        explanation: "Displacement has magnitude and direction.",
        marks: 1
      },
      {
        quizId: physicsQuiz2.id,
        chapterId: physicsCh2.id,
        question: "If a body starts from rest with acceleration 2 m/s^2, velocity after 5 s is:",
        optionA: "5 m/s",
        optionB: "7 m/s",
        optionC: "10 m/s",
        optionD: "12 m/s",
        correctOption: "c",
        explanation: "v = 0 + 2 x 5 = 10 m/s.",
        marks: 1
      },
      {
        quizId: physicsQuiz2.id,
        chapterId: physicsCh2.id,
        question: "The slope of a velocity-time graph gives:",
        optionA: "Distance",
        optionB: "Acceleration",
        optionC: "Force",
        optionD: "Mass",
        correctOption: "b",
        explanation: "Slope of a v-t graph gives acceleration.",
        marks: 1
      },
      {
        quizId: physicsQuiz2.id,
        chapterId: physicsCh2.id,
        question: "Which equation of motion is correct?",
        optionA: "v = u + at",
        optionB: "v = u - st",
        optionC: "s = uv + a",
        optionD: "a = uv/s",
        correctOption: "a",
        explanation: "v = u + at is the first equation of motion.",
        marks: 1
      },
      {
        quizId: physicsQuiz3.id,
        chapterId: physicsCh3.id,
        question: "SI unit of force is:",
        optionA: "Joule",
        optionB: "Pascal",
        optionC: "Newton",
        optionD: "Watt",
        correctOption: "c",
        explanation: "Force is measured in newtons.",
        marks: 1
      },
      {
        quizId: physicsQuiz3.id,
        chapterId: physicsCh3.id,
        question: "Newton's first law is also called the law of:",
        optionA: "Motion",
        optionB: "Inertia",
        optionC: "Pressure",
        optionD: "Energy",
        correctOption: "b",
        explanation: "Newton's first law is the law of inertia.",
        marks: 1
      },
      {
        quizId: physicsQuiz3.id,
        chapterId: physicsCh3.id,
        question: "Momentum equals:",
        optionA: "mass x velocity",
        optionB: "force x time squared",
        optionC: "mass / velocity",
        optionD: "weight x distance",
        correctOption: "a",
        explanation: "Momentum is mass multiplied by velocity.",
        marks: 1
      },
      {
        quizId: physicsQuiz3.id,
        chapterId: physicsCh3.id,
        question: "Every action has an equal and opposite reaction is:",
        optionA: "Newton's first law",
        optionB: "Newton's second law",
        optionC: "Newton's third law",
        optionD: "Law of gravitation",
        correctOption: "c",
        explanation: "That statement is Newton's third law.",
        marks: 1
      },
      {
        quizId: chemistryQuiz1.id,
        chapterId: chemistryCh1.id,
        question: "A compound is made of:",
        optionA: "One type of atom only",
        optionB: "Two or more chemically combined elements",
        optionC: "One nucleus and one electron",
        optionD: "Only metals",
        correctOption: "b",
        explanation: "A compound contains chemically combined elements.",
        marks: 1
      },
      {
        quizId: chemistryQuiz1.id,
        chapterId: chemistryCh1.id,
        question: "Smallest particle of an element is:",
        optionA: "Compound",
        optionB: "Mixture",
        optionC: "Atom",
        optionD: "Solution",
        correctOption: "c",
        explanation: "Atom is the smallest particle of an element.",
        marks: 1
      },
      {
        quizId: chemistryQuiz1.id,
        chapterId: chemistryCh1.id,
        question: "Air is best described as a:",
        optionA: "Compound",
        optionB: "Mixture",
        optionC: "Element",
        optionD: "Molecule",
        correctOption: "b",
        explanation: "Air is a mixture of gases.",
        marks: 1
      },
      {
        quizId: mockQuiz2023.id,
        chapterId: physicsCh1.id,
        question: "Which instrument measures small diameter accurately?",
        optionA: "Meter rule",
        optionB: "Screw gauge",
        optionC: "Stopwatch",
        optionD: "Spring balance",
        correctOption: "b",
        explanation: "A screw gauge measures small diameters accurately.",
        marks: 1
      },
      {
        quizId: mockQuiz2023.id,
        chapterId: physicsCh2.id,
        question: "Area under a velocity-time graph gives:",
        optionA: "Displacement",
        optionB: "Acceleration",
        optionC: "Momentum",
        optionD: "Density",
        correctOption: "a",
        explanation: "Area under v-t graph gives displacement.",
        marks: 1
      },
      {
        quizId: mockQuiz2023.id,
        chapterId: physicsCh2.id,
        question: "A vector quantity among these is:",
        optionA: "Speed",
        optionB: "Distance",
        optionC: "Velocity",
        optionD: "Mass",
        correctOption: "c",
        explanation: "Velocity is vector.",
        marks: 1
      },
      {
        quizId: mockQuiz2023.id,
        chapterId: physicsCh3.id,
        question: "Force equals:",
        optionA: "m/a",
        optionB: "m x a",
        optionC: "a/t",
        optionD: "m + a",
        correctOption: "b",
        explanation: "Force equals mass times acceleration.",
        marks: 1
      },
      {
        quizId: mockQuiz2023.id,
        chapterId: physicsCh3.id,
        question: "Momentum unit is:",
        optionA: "kg m/s",
        optionB: "N/m",
        optionC: "kg/m",
        optionD: "m/s^2",
        correctOption: "a",
        explanation: "Momentum unit is kg m/s.",
        marks: 1
      },
      {
        quizId: mockQuiz2023.id,
        chapterId: physicsCh1.id,
        question: "Which of these affects precision most directly?",
        optionA: "Instrument least count",
        optionB: "Chapter title",
        optionC: "Board name",
        optionD: "Seat number",
        correctOption: "a",
        explanation: "Precision depends strongly on least count.",
        marks: 1
      },
      {
        quizId: mockQuiz2024.id,
        chapterId: physicsCh1.id,
        question: "Scientific notation for 0.00045 is:",
        optionA: "4.5 x 10^-4",
        optionB: "45 x 10^-4",
        optionC: "4.5 x 10^4",
        optionD: "0.45 x 10^-4",
        correctOption: "a",
        explanation: "Correct scientific notation is 4.5 x 10^-4.",
        marks: 1
      },
      {
        quizId: mockQuiz2024.id,
        chapterId: physicsCh2.id,
        question: "The second equation of motion is:",
        optionA: "s = ut + 1/2at^2",
        optionB: "v = u + as",
        optionC: "F = ma",
        optionD: "p = mv",
        correctOption: "a",
        explanation: "The second equation of motion is s = ut + 1/2at^2.",
        marks: 1
      },
      {
        quizId: mockQuiz2024.id,
        chapterId: physicsCh2.id,
        question: "Uniform circular motion has changing:",
        optionA: "Mass",
        optionB: "Velocity direction",
        optionC: "Time",
        optionD: "Least count",
        correctOption: "b",
        explanation: "Direction changes continuously in circular motion.",
        marks: 1
      },
      {
        quizId: mockQuiz2024.id,
        chapterId: physicsCh3.id,
        question: "Inertia depends on:",
        optionA: "Velocity",
        optionB: "Mass",
        optionC: "Temperature",
        optionD: "Area",
        correctOption: "b",
        explanation: "Inertia depends on mass.",
        marks: 1
      },
      {
        quizId: mockQuiz2024.id,
        chapterId: physicsCh3.id,
        question: "Newton's second law links force with:",
        optionA: "Pressure",
        optionB: "Acceleration",
        optionC: "Volume",
        optionD: "Current",
        correctOption: "b",
        explanation: "Force is proportional to acceleration for a given mass.",
        marks: 1
      },
      {
        quizId: mockQuiz2024.id,
        chapterId: physicsCh1.id,
        question: "A measuring cylinder is used for:",
        optionA: "Volume",
        optionB: "Temperature",
        optionC: "Mass",
        optionD: "Force",
        correctOption: "a",
        explanation: "A measuring cylinder measures liquid volume.",
        marks: 1
      }
    ])
    .returning();

  await db.insert(mockExams).values([
    {
      boardId: fbiseBoard.id,
      grade: "9",
      subjectId: physics9.id,
      quizId: mockQuiz2023.id,
      title: "Physics Grade 9 Annual Mock Exam",
      year: 2023,
      durationMinutes: 90,
      totalMarks: 6
    },
    {
      boardId: fbiseBoard.id,
      grade: "9",
      subjectId: physics9.id,
      quizId: mockQuiz2024.id,
      title: "Physics Grade 9 Send-Up Mock Exam",
      year: 2024,
      durationMinutes: 90,
      totalMarks: 6
    }
  ]);

  await db.insert(examAnalysis).values([
    {
      boardId: fbiseBoard.id,
      subjectId: physics9.id,
      chapterId: physicsCh1.id,
      occurrenceCount: 2,
      avgMarks: 2,
      lastSeenYear: 2024
    },
    {
      boardId: fbiseBoard.id,
      subjectId: physics9.id,
      chapterId: physicsCh2.id,
      occurrenceCount: 2,
      avgMarks: 2,
      lastSeenYear: 2024
    },
    {
      boardId: fbiseBoard.id,
      subjectId: physics9.id,
      chapterId: physicsCh3.id,
      occurrenceCount: 2,
      avgMarks: 2,
      lastSeenYear: 2024
    }
  ]);

  const [adminUser, studentAyesha, studentBilal, studentHina, suspendedUser] = await db
    .insert(users)
    .values([
      {
        id: "user_admin_001",
        name: "Admin User",
        email: "admin@example.com",
        emailVerified: true,
        role: "admin",
        degree: "M.Ed",
        board: "fbise",
        xp: 850,
        level: 3
      },
      {
        id: "user_student_001",
        name: "Ayesha Khan",
        email: "ayesha.khan@example.com",
        emailVerified: true,
        role: "student",
        class: "9",
        board: "fbise",
        xp: 420,
        level: 2
      },
      {
        id: "user_student_002",
        name: "Bilal Ahmed",
        email: "bilal.ahmed@example.com",
        emailVerified: true,
        role: "student",
        class: "9",
        board: "fbise",
        xp: 185,
        level: 1,
        streakFreezeUsedAt: daysAgo(9)
      },
      {
        id: "user_student_003",
        name: "Hina Tariq",
        email: "hina.tariq@example.com",
        emailVerified: true,
        role: "student",
        class: "10",
        board: "fbise",
        xp: 70,
        level: 0
      },
      {
        id: "user_student_004",
        name: "Omar Saeed",
        email: "omar.saeed@example.com",
        emailVerified: true,
        role: "student",
        class: "10",
        board: "fbise",
        status: "suspended",
        suspendedReason: "Seeded suspended account for admin lifecycle coverage.",
        suspendedBy: "user_admin_001"
      }
    ])
    .returning();

  const passwordHash = await hashPassword("password");
  await db.insert(accounts).values([
    { id: "account_admin_001", accountId: adminUser.id, providerId: "credential", userId: adminUser.id, password: passwordHash },
    { id: "account_student_001", accountId: studentAyesha.id, providerId: "credential", userId: studentAyesha.id, password: passwordHash },
    { id: "account_student_002", accountId: studentBilal.id, providerId: "credential", userId: studentBilal.id, password: passwordHash },
    { id: "account_student_003", accountId: studentHina.id, providerId: "credential", userId: studentHina.id, password: passwordHash }
  ]);

  const [formulaVelocity, formulaAcceleration, formulaForce, formulaDensity] = await db
    .insert(formulas)
    .values([
      {
        subjectId: physics9.id,
        chapterId: physicsCh2.id,
        name: "Velocity",
        formulaLatex: "v = \\frac{s}{t}",
        description: "Average velocity when displacement and time are known.",
        variables: [
          { symbol: "v", meaning: "velocity" },
          { symbol: "s", meaning: "displacement" },
          { symbol: "t", meaning: "time" }
        ],
        tags: ["motion", "average"]
      },
      {
        subjectId: physics9.id,
        chapterId: physicsCh2.id,
        name: "Acceleration",
        formulaLatex: "a = \\frac{v-u}{t}",
        description: "Rate of change of velocity over time.",
        variables: [
          { symbol: "a", meaning: "acceleration" },
          { symbol: "u", meaning: "initial velocity" },
          { symbol: "v", meaning: "final velocity" }
        ],
        tags: ["motion", "graph"]
      },
      {
        subjectId: physics9.id,
        chapterId: physicsCh3.id,
        name: "Force",
        formulaLatex: "F = ma",
        description: "Newton's second law relating force, mass, and acceleration.",
        variables: [
          { symbol: "F", meaning: "force" },
          { symbol: "m", meaning: "mass" },
          { symbol: "a", meaning: "acceleration" }
        ],
        tags: ["newton", "dynamics"]
      },
      {
        subjectId: chemistry9.id,
        chapterId: chemistryCh1.id,
        name: "Density",
        formulaLatex: "\\rho = \\frac{m}{V}",
        description: "Mass per unit volume.",
        variables: [
          { symbol: "\\rho", meaning: "density" },
          { symbol: "m", meaning: "mass" },
          { symbol: "V", meaning: "volume" }
        ],
        tags: ["matter", "measurement"]
      }
    ])
    .returning();

  await db.insert(userStarredFormulas).values([
    { userId: studentAyesha.id, formulaId: formulaVelocity.id },
    { userId: studentAyesha.id, formulaId: formulaForce.id },
    { userId: studentBilal.id, formulaId: formulaAcceleration.id }
  ]);

  await db.insert(formulaAccessEvents).values([
    { userId: studentAyesha.id, formulaId: formulaVelocity.id, accessedAt: daysAgo(1, 6) },
    { userId: studentAyesha.id, formulaId: formulaVelocity.id, accessedAt: daysAgo(0, 7) },
    { userId: studentAyesha.id, formulaId: formulaForce.id, accessedAt: daysAgo(2, 8) },
    { userId: studentBilal.id, formulaId: formulaAcceleration.id, accessedAt: daysAgo(0, 10) }
  ]);

  const [ayeshaQuiz1, ayeshaQuiz2Attempt1, ayeshaQuiz2Attempt2, ayeshaMock2023, bilalQuiz1, bilalQuiz2, bilalMock2024] = await db
    .insert(quizAttempts)
    .values([
      {
        userId: studentAyesha.id,
        quizId: physicsQuiz1.id,
        type: "chapter_quiz",
        answers: {
          [String(q1a.id)]: "b",
          [String(q1b.id)]: "c",
          [String(q1c.id)]: "a",
          [String(q1d.id)]: "b"
        },
        score: 4,
        totalMarks: 4,
        startedAt: daysAgo(4, 9),
        completedAt: daysAgo(4, 9)
      },
      {
        userId: studentAyesha.id,
        quizId: physicsQuiz2.id,
        type: "chapter_quiz",
        answers: {
          [String(q2a.id)]: "a",
          [String(q2b.id)]: "a",
          [String(q2c.id)]: "c",
          [String(q2d.id)]: "b"
        },
        score: 1,
        totalMarks: 4,
        startedAt: daysAgo(3, 8),
        completedAt: daysAgo(3, 8)
      },
      {
        userId: studentAyesha.id,
        quizId: physicsQuiz2.id,
        type: "chapter_quiz",
        answers: {
          [String(q2a.id)]: "b",
          [String(q2b.id)]: "c",
          [String(q2c.id)]: "b",
          [String(q2d.id)]: "a"
        },
        score: 4,
        totalMarks: 4,
        startedAt: daysAgo(1, 11),
        completedAt: daysAgo(1, 11)
      },
      {
        userId: studentAyesha.id,
        quizId: mockQuiz2023.id,
        type: "mock_exam",
        answers: {
          "16": "b",
          "17": "a",
          "18": "c",
          "19": "b",
          "20": "a",
          "21": "a"
        },
        score: 6,
        totalMarks: 6,
        startedAt: daysAgo(2, 9),
        completedAt: daysAgo(2, 10)
      },
      {
        userId: studentBilal.id,
        quizId: physicsQuiz1.id,
        type: "chapter_quiz",
        answers: {
          [String(q1a.id)]: "b",
          [String(q1b.id)]: "a",
          [String(q1c.id)]: "c",
          [String(q1d.id)]: "b"
        },
        score: 2,
        totalMarks: 4,
        startedAt: daysAgo(5, 7),
        completedAt: daysAgo(5, 7)
      },
      {
        userId: studentBilal.id,
        quizId: physicsQuiz2.id,
        type: "chapter_quiz",
        answers: {
          [String(q2a.id)]: "a",
          [String(q2b.id)]: "a",
          [String(q2c.id)]: "a",
          [String(q2d.id)]: "b"
        },
        score: 0,
        totalMarks: 4,
        startedAt: daysAgo(1, 6),
        completedAt: daysAgo(1, 6)
      },
      {
        userId: studentBilal.id,
        quizId: mockQuiz2024.id,
        type: "mock_exam",
        answers: {
          "22": "a",
          "23": "a",
          "24": "b",
          "25": "b",
          "26": "b",
          "27": "a"
        },
        score: 5,
        totalMarks: 6,
        startedAt: daysAgo(1, 14),
        completedAt: daysAgo(1, 15)
      }
    ])
    .returning();

  await db.insert(quizDuelChallenges).values([
    {
      quizId: physicsQuiz2.id,
      challengerUserId: studentAyesha.id,
      challengerAttemptId: ayeshaQuiz2Attempt2.id,
      recipientUserId: studentBilal.id,
      recipientAttemptId: bilalQuiz2.id,
      expiresAt: daysAhead(2, 12)
    }
  ]);

  await db.insert(userProgress).values([
    {
      userId: studentAyesha.id,
      chapterId: physicsCh1.id,
      visitedAt: daysAgo(4, 10),
      summaryRead: true,
      subpartsReadCount: physicsCh1SubpartIds.length,
      exercisesViewed: 2,
      flashcardsCompleted: true,
      quizBestScore: 4,
      quizAttemptsCount: 1
    },
    {
      userId: studentAyesha.id,
      chapterId: physicsCh2.id,
      visitedAt: daysAgo(1, 12),
      summaryRead: true,
      subpartsReadCount: physicsCh2SubpartIds.length,
      exercisesViewed: 2,
      flashcardsCompleted: false,
      quizBestScore: 4,
      quizAttemptsCount: 2
    },
    {
      userId: studentAyesha.id,
      chapterId: physicsCh3.id,
      visitedAt: daysAgo(0, 8),
      summaryRead: true,
      subpartsReadCount: physicsCh3SubpartIds.length,
      exercisesViewed: 1,
      flashcardsCompleted: false,
      quizBestScore: 0,
      quizAttemptsCount: 0
    },
    {
      userId: studentBilal.id,
      chapterId: physicsCh1.id,
      visitedAt: daysAgo(5, 8),
      summaryRead: true,
      subpartsReadCount: physicsCh1SubpartIds.length,
      exercisesViewed: 1,
      flashcardsCompleted: true,
      quizBestScore: 2,
      quizAttemptsCount: 1
    },
    {
      userId: studentBilal.id,
      chapterId: physicsCh2.id,
      visitedAt: daysAgo(1, 7),
      summaryRead: true,
      subpartsReadCount: physicsCh2SubpartIds.length,
      exercisesViewed: 1,
      flashcardsCompleted: false,
      quizBestScore: 0,
      quizAttemptsCount: 1
    },
    {
      userId: studentHina.id,
      chapterId: biologyCh1.id,
      visitedAt: daysAgo(2, 9),
      summaryRead: true,
      subpartsReadCount: biologyCh1SubpartIds.length,
      exercisesViewed: 1,
      flashcardsCompleted: false,
      quizBestScore: 0,
      quizAttemptsCount: 0
    }
  ]);

  const buildSubpartProgressRows = (
    userId: string,
    chapterId: number,
    readAt: Date,
    subpartIds: number[]
  ) =>
    subpartIds.map((subpartId) => ({
      userId,
      chapterId,
      subpartId,
      readAt
    }));

  await db.insert(userProgressSubparts).values([
    ...buildSubpartProgressRows(studentAyesha.id, physicsCh1.id, daysAgo(4, 10), physicsCh1SubpartIds),
    ...buildSubpartProgressRows(studentAyesha.id, physicsCh2.id, daysAgo(1, 12), physicsCh2SubpartIds),
    ...buildSubpartProgressRows(studentAyesha.id, physicsCh3.id, daysAgo(0, 8), physicsCh3SubpartIds),
    ...buildSubpartProgressRows(studentBilal.id, physicsCh1.id, daysAgo(5, 8), physicsCh1SubpartIds),
    ...buildSubpartProgressRows(studentBilal.id, physicsCh2.id, daysAgo(1, 7), physicsCh2SubpartIds),
    ...buildSubpartProgressRows(studentHina.id, biologyCh1.id, daysAgo(2, 9), biologyCh1SubpartIds)
  ]);

  await db.insert(flashcardReviews).values([
    {
      cardId: p1f1.id,
      userId: studentAyesha.id,
      intervalDays: 1,
      easeFactor: 2.6,
      repetitions: 2,
      nextReviewDate: daysAgo(0, 6),
      lastReviewedAt: daysAgo(1, 6),
      createdAt: daysAgo(3, 6),
      updatedAt: daysAgo(1, 6)
    },
    {
      cardId: p2f1.id,
      userId: studentAyesha.id,
      intervalDays: 3,
      easeFactor: 2.5,
      repetitions: 3,
      nextReviewDate: daysAhead(2, 7),
      lastReviewedAt: daysAgo(1, 7),
      createdAt: daysAgo(4, 7),
      updatedAt: daysAgo(1, 7)
    },
    {
      cardId: p2f2.id,
      userId: studentBilal.id,
      intervalDays: 0,
      easeFactor: 2.3,
      repetitions: 0,
      nextReviewDate: daysAgo(0, 5),
      lastReviewedAt: daysAgo(1, 5),
      createdAt: daysAgo(2, 5),
      updatedAt: daysAgo(1, 5)
    },
    {
      cardId: c1f1.id,
      userId: studentBilal.id,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 1,
      nextReviewDate: daysAhead(1, 9),
      lastReviewedAt: daysAgo(0, 9),
      createdAt: daysAgo(2, 9),
      updatedAt: daysAgo(0, 9)
    }
  ]);

  const [sessionAyesha] = await db
    .insert(aiChatSessions)
    .values([
      {
        userId: studentAyesha.id,
        chapterId: physicsCh2.id,
        title: "Why does acceleration become negative?",
        createdAt: daysAgo(1, 13),
        lastMessageAt: daysAgo(1, 13)
      }
    ])
    .returning();

  await db.insert(aiMessages).values([
    {
      sessionId: sessionAyesha.id,
      role: "user",
      content: "Why is acceleration negative when velocity is decreasing?",
      createdAt: daysAgo(1, 13)
    },
    {
      sessionId: sessionAyesha.id,
      role: "assistant",
      content: "It depends on your chosen positive direction. If acceleration acts opposite to positive motion, it becomes negative.",
      createdAt: daysAgo(1, 13)
    }
  ]);

  await db.insert(aiUsageLogs).values([
    {
      userId: studentAyesha.id,
      sessionId: sessionAyesha.id,
      model: "claude-sonnet-4-20250514",
      promptTokens: 52,
      completionTokens: 111,
      createdAt: daysAgo(1, 13)
    }
  ]);

  await db.insert(aiContext).values([
    {
      userId: studentAyesha.id,
      weakTopics: ["kinematics graphs", "sign convention"],
      strongTopics: ["units", "significant figures"],
      preferredExplanationStyle: "visual",
      lastConceptsDiscussed: ["negative acceleration", "velocity-time graph"],
      updatedAt: daysAgo(0, 9),
      createdAt: daysAgo(2, 9)
    }
  ]);

  await db.insert(aiConversationEvents).values([
    {
      sessionId: sessionAyesha.id,
      eventType: "quick-revision-opened",
      metadata: { chapterId: physicsCh2.id },
      createdAt: daysAgo(1, 13)
    }
  ]);

  const [thread1, thread2] = await db
    .insert(forumThreads)
    .values([
      {
        userId: studentAyesha.id,
        subjectId: physics9.id,
        chapterId: physicsCh2.id,
        title: "How do you decide the sign of acceleration?",
        body: "I keep getting graph questions wrong because I switch signs halfway through.",
        isPinned: false,
        isSolved: true,
        views: 12,
        createdAt: daysAgo(2, 10),
        updatedAt: daysAgo(2, 10)
      },
      {
        userId: studentBilal.id,
        subjectId: physics9.id,
        chapterId: physicsCh1.id,
        title: "Best way to remember SI base units?",
        body: "Need a quick revision trick before test day.",
        isPinned: true,
        isSolved: false,
        views: 21,
        createdAt: daysAgo(3, 9),
        updatedAt: daysAgo(3, 9)
      }
    ])
    .returning();

  const [reply1, reply2] = await db
    .insert(forumReplies)
    .values([
      {
        threadId: thread1.id,
        userId: adminUser.id,
        body: "Set one positive direction before solving and keep every displacement, velocity, and acceleration relative to it.",
        isAcceptedAnswer: true,
        upvotes: 4,
        createdAt: daysAgo(2, 11),
        updatedAt: daysAgo(2, 11)
      },
      {
        threadId: thread2.id,
        userId: studentAyesha.id,
        body: "I use a handwritten list: meter, kilogram, second, ampere, kelvin, mole, candela.",
        isAcceptedAnswer: false,
        upvotes: 2,
        createdAt: daysAgo(3, 10),
        updatedAt: daysAgo(3, 10)
      }
    ])
    .returning();

  await db.insert(forumReplyVotes).values([
    { userId: studentAyesha.id, replyId: reply1.id, voteType: "upvote", createdAt: daysAgo(2, 11) },
    { userId: studentBilal.id, replyId: reply2.id, voteType: "upvote", createdAt: daysAgo(3, 11) }
  ]);

  await db.insert(moderationFlags).values([
    {
      targetType: "thread",
      targetId: thread2.id,
      targetLabel: thread2.title,
      reason: "Review seeded moderation queue",
      status: "open",
      createdAt: daysAgo(1, 8)
    }
  ]);

  await db.insert(adminAuditLogs).values([
    {
      scope: "content",
      action: "SEED_CONTENT_V2",
      target: `subject:${physics9.id}`,
      status: "success",
      message: "Seeded modern chapter, formulas, and mock exam fixtures.",
      actorId: adminUser.id,
      actorName: adminUser.name,
      createdAt: daysAgo(0, 7)
    }
  ]);

  await db.insert(adminSettings).values([
    {
      key: "ramadan_mode",
      value: "false",
      description: "Controls Ramadan adjusted pacing.",
      updatedBy: adminUser.id,
      updatedAt: daysAgo(0, 7)
    },
    {
      key: "ramadan_fasting_hours",
      value: "04:00-18:00",
      description: "Configured fasting hours for today's focus pacing.",
      updatedBy: adminUser.id,
      updatedAt: daysAgo(0, 7)
    },
    {
      key: "forum_auto_lock_hours",
      value: "24",
      description: "Auto-lock inactive forum threads after N hours.",
      updatedBy: adminUser.id,
      updatedAt: daysAgo(0, 7)
    }
  ]);

  await db.insert(adminNotifications).values([
    {
      title: "Seed ready for manual QA",
      message: "Current-feature fixtures loaded for dashboard, quick revision, formulas, and past papers.",
      audience: "admins",
      status: "sent",
      createdBy: adminUser.id,
      createdAt: daysAgo(0, 7)
    }
  ]);

  await db.insert(streakWagers).values([
    {
      userId: studentAyesha.id,
      amount: 50,
      bonusXp: 25,
      protectedDate: new Date(now.getTime() - dayMs).toISOString().slice(0, 10),
      status: "won",
      completedGoal: true,
      placedAt: daysAgo(1, 1),
      expiresAt: daysAgo(0, 1),
      settledAt: daysAgo(0, 2)
    },
    {
      userId: studentBilal.id,
      amount: 25,
      bonusXp: 13,
      protectedDate: daysAgo(3, 1).toISOString().slice(0, 10),
      status: "lost",
      completedGoal: false,
      placedAt: daysAgo(3, 1),
      expiresAt: daysAgo(2, 1),
      settledAt: daysAgo(2, 2)
    }
  ]);

  await db.insert(userDailyMomentumGoals).values([
    {
      userId: studentAyesha.id,
      dateKey: daysAgo(1, 0).toISOString().slice(0, 10),
      focusType: "weak_quiz",
      chapterId: physicsCh2.id,
      xpAwarded: 15,
      completedAt: daysAgo(1, 18)
    }
  ]);

  const [studyGroup] = await db
    .insert(studyGroups)
    .values([
      {
        name: "Physics Sprint Group",
        createdBy: studentAyesha.id,
        createdAt: daysAgo(4, 9),
        updatedAt: daysAgo(0, 9)
      }
    ])
    .returning();

  await db.insert(studyGroupMembers).values([
    { groupId: studyGroup.id, userId: studentAyesha.id, joinedAt: daysAgo(4, 9) },
    { groupId: studyGroup.id, userId: studentBilal.id, joinedAt: daysAgo(4, 9) },
    { groupId: studyGroup.id, userId: studentHina.id, joinedAt: daysAgo(3, 8) }
  ]);

  await db.insert(studyGroupActivities).values([
    {
      groupId: studyGroup.id,
      actorUserId: studentAyesha.id,
      recipientUserId: studentBilal.id,
      activityType: "quiz_score_beaten",
      chapterId: physicsCh2.id,
      quizAttemptId: ayeshaQuiz2Attempt2.id,
      metadata: { scorePercent: 100, previousBestPercent: 0 },
      createdAt: daysAgo(1, 12)
    },
    {
      groupId: studyGroup.id,
      actorUserId: studentBilal.id,
      activityType: "chapter_completed",
      chapterId: physicsCh1.id,
      metadata: {},
      createdAt: daysAgo(5, 8)
    }
  ]);

  console.log("Seed complete.");
  console.log("Manual test users:");
  console.log("- admin@example.com / password");
  console.log("- ayesha.khan@example.com / password");
  console.log("- bilal.ahmed@example.com / password");
  console.log("- hina.tariq@example.com / password");

  await pool.end();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
