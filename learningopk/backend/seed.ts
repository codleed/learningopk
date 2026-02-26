import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import * as schema from "./src/lib/db/schema.js";
import { clearDatabase } from "./src/lib/db/clear-database.js";
import {
  accounts,
  boards,
  subjects,
  chapters,
  exercises,
  flashcards,
  quizzes,
  quizQuestions,
  quizAttempts,
  users,
  aiChatSessions,
  aiMessages,
  aiUsageLogs,
  forumThreads,
  forumReplies,
  forumReplyVotes,
  userProgress,
  mockExams,
  contentSources,
  adminAuditLogs,
  moderationFlags,
  adminNotifications,
  adminSettings,
} from "./src/lib/db/schema.js";

config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/learningo",
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("ðŸŒ± Seeding database...");
  await clearDatabase(db);
  console.log("Cleared existing data");

  // â”€â”€ Boards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [boardFBISE, boardPunjab] = await db
    .insert(boards)
    .values([
      { name: "Federal Board (FBISE)", slug: "fbise" },
      { name: "Punjab Board (BISE Lahore)", slug: "bise-lahore" },
    ])
    .returning();

  console.log("âœ… Boards seeded");

  // â”€â”€ Subjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [subjectPhysics, subjectChem, subjectBio, subjectMath] = await db
    .insert(subjects)
    .values([
      {
        boardId: boardFBISE.id,
        grade: "9",
        name: "Physics",
        slug: "physics",
        icon: "âš›ï¸",
        description: "Fundamentals of physics for grade 9 students.",
      },
      {
        boardId: boardFBISE.id,
        grade: "9",
        name: "Chemistry",
        slug: "chemistry",
        icon: "ðŸ§ª",
        description: "Introduction to chemistry concepts.",
      },
      {
        boardId: boardFBISE.id,
        grade: "10",
        name: "Biology",
        slug: "biology",
        icon: "ðŸ§¬",
        description: "Life sciences for grade 10.",
      },
      {
        boardId: boardPunjab.id,
        grade: "9",
        name: "Mathematics",
        slug: "mathematics",
        icon: "ðŸ“",
        description: "Core mathematics curriculum.",
      },
    ])
    .returning();

  console.log("âœ… Subjects seeded");

  // â”€â”€ Content Sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sourcePhysics] = await db
    .insert(contentSources)
    .values([
      {
        boardId: boardFBISE.id,
        grade: "9",
        subjectId: subjectPhysics.id,
        fileName: "physics_grade9_fbise.pdf",
        fileHash: "abc123def456",
        parserVersion: "1.0.0",
      },
    ])
    .returning();

  console.log("âœ… Content sources seeded");

  // â”€â”€ Chapters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [ch1, ch2, ch3] = await db
    .insert(chapters)
    .values([
      {
        subjectId: subjectPhysics.id,
        chapterNumber: 1,
        title: "Physical Quantities and Measurement",
        slug: "physical-quantities-and-measurement",
        summary:
          "This chapter covers the basic physical quantities, SI units, measuring instruments, and significant figures.",
        isPublished: true,
        sourceId: sourcePhysics.id,
      },
      {
        subjectId: subjectPhysics.id,
        chapterNumber: 2,
        title: "Kinematics",
        slug: "kinematics",
        summary:
          "Study of motion in a straight line, distance, displacement, speed, velocity, and acceleration.",
        isPublished: true,
        sourceId: sourcePhysics.id,
      },
      {
        subjectId: subjectChem.id,
        chapterNumber: 1,
        title: "Fundamentals of Chemistry",
        slug: "fundamentals-of-chemistry",
        summary:
          "Introduction to atoms, molecules, elements, compounds, and mixtures.",
        isPublished: true,
        sourceId: null,
      },
    ])
    .returning();

  console.log("âœ… Chapters seeded");

  // â”€â”€ Exercises â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.insert(exercises).values([
    {
      chapterId: ch1.id,
      exerciseNumber: "1.1",
      question: "Define physical quantities and give two examples.",
      solution:
        "Physical quantities are measurable properties of nature. Examples: length (measured in meters) and mass (measured in kilograms).",
      difficulty: "easy",
      type: "short",
    },
    {
      chapterId: ch1.id,
      exerciseNumber: "1.2",
      question: "What is the least count of a vernier caliper?",
      solution:
        "The least count of a vernier caliper is 0.1 mm or 0.01 cm. It is calculated as: LC = 1 MSD âˆ’ 1 VSD.",
      difficulty: "medium",
      type: "short",
    },
    {
      chapterId: ch1.id,
      exerciseNumber: "1.3",
      question:
        "A student measures the diameter of a wire as 1.24 mm using a screw gauge. Express this in scientific notation.",
      solution: "1.24 mm = 1.24 Ã— 10â»Â³ m",
      difficulty: "easy",
      type: "numerical",
    },
    {
      chapterId: ch2.id,
      exerciseNumber: "2.1",
      question: "Differentiate between distance and displacement.",
      solution:
        "Distance is the total path length traveled (scalar), while displacement is the shortest straight-line distance between start and end points with direction (vector).",
      difficulty: "easy",
      type: "short",
    },
    {
      chapterId: ch2.id,
      exerciseNumber: "2.2",
      question:
        "A car travels 60 km north and then 80 km east. Calculate the resultant displacement.",
      solution:
        "Using Pythagoras theorem: displacement = âˆš(60Â² + 80Â²) = âˆš(3600 + 6400) = âˆš10000 = 100 km at an angle Î¸ = tanâ»Â¹(80/60) â‰ˆ 53Â° east of north.",
      difficulty: "hard",
      type: "numerical",
    },
    {
      chapterId: ch3.id,
      exerciseNumber: "1.1",
      question: "What is the difference between an element and a compound?",
      solution:
        "An element consists of only one type of atom and cannot be broken down chemically. A compound consists of two or more elements chemically combined in a fixed ratio.",
      difficulty: "easy",
      type: "short",
    },
  ]);

  console.log("âœ… Exercises seeded");

  // â”€â”€ Flashcards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.insert(flashcards).values([
    {
      chapterId: ch1.id,
      front: "What is a physical quantity?",
      back: "A measurable property of nature, e.g., mass, length, time.",
      orderIndex: 1,
    },
    {
      chapterId: ch1.id,
      front: "What are the 7 base SI units?",
      back: "meter (m), kilogram (kg), second (s), ampere (A), kelvin (K), mole (mol), candela (cd)",
      orderIndex: 2,
    },
    {
      chapterId: ch1.id,
      front: "What is least count?",
      back: "The smallest measurement that an instrument can reliably measure.",
      orderIndex: 3,
    },
    {
      chapterId: ch2.id,
      front: "Define velocity.",
      back: "Velocity is the rate of change of displacement. It is a vector quantity (m/s).",
      orderIndex: 1,
    },
    {
      chapterId: ch2.id,
      front: "Define acceleration.",
      back: "Acceleration is the rate of change of velocity. a = Î”v/Î”t (m/sÂ²).",
      orderIndex: 2,
    },
    {
      chapterId: ch3.id,
      front: "What is an atom?",
      back: "The smallest unit of an element that retains its chemical properties.",
      orderIndex: 1,
    },
    {
      chapterId: ch3.id,
      front: "What is a molecule?",
      back: "Two or more atoms chemically bonded together.",
      orderIndex: 2,
    },
  ]);

  console.log("âœ… Flashcards seeded");

  // â”€â”€ Quizzes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [quiz1, quiz2] = await db
    .insert(quizzes)
    .values([
      {
        chapterId: ch1.id,
        title: "Chapter 1 Quiz â€“ Physical Quantities",
        durationMinutes: 20,
        totalMarks: 10,
        type: "chapter_quiz",
      },
      {
        chapterId: ch2.id,
        title: "Chapter 2 Quiz â€“ Kinematics",
        durationMinutes: 25,
        totalMarks: 10,
        type: "chapter_quiz",
      },
    ])
    .returning();

  console.log("âœ… Quizzes seeded");

  // â”€â”€ Quiz Questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.insert(quizQuestions).values([
    {
      quizId: quiz1.id,
      question: "Which of the following is a base SI unit?",
      optionA: "Newton",
      optionB: "Kilogram",
      optionC: "Joule",
      optionD: "Watt",
      correctOption: "b",
      explanation:
        "Kilogram (kg) is one of the 7 base SI units. Newton, Joule, and Watt are derived units.",
      marks: 1,
    },
    {
      quizId: quiz1.id,
      question: "The least count of a vernier caliper is:",
      optionA: "0.001 mm",
      optionB: "0.01 mm",
      optionC: "0.1 mm",
      optionD: "1 mm",
      correctOption: "c",
      explanation: "The least count of a standard vernier caliper is 0.1 mm.",
      marks: 1,
    },
    {
      quizId: quiz1.id,
      question: "Scientific notation for 0.00045 is:",
      optionA: "4.5 Ã— 10Â²",
      optionB: "4.5 Ã— 10â»â´",
      optionC: "45 Ã— 10â»âµ",
      optionD: "0.45 Ã— 10â»Â³",
      correctOption: "b",
      explanation: "0.00045 = 4.5 Ã— 10â»â´ in proper scientific notation.",
      marks: 1,
    },
    {
      quizId: quiz2.id,
      question: "Displacement is a:",
      optionA: "Scalar quantity",
      optionB: "Vector quantity",
      optionC: "Neither scalar nor vector",
      optionD: "Dimensionless quantity",
      correctOption: "b",
      explanation:
        "Displacement has both magnitude and direction, so it is a vector quantity.",
      marks: 1,
    },
    {
      quizId: quiz2.id,
      question:
        "A body moving with uniform velocity has acceleration equal to:",
      optionA: "Maximum",
      optionB: "1 m/sÂ²",
      optionC: "Zero",
      optionD: "Variable",
      correctOption: "c",
      explanation:
        "Uniform velocity means no change in velocity, so acceleration = 0.",
      marks: 1,
    },
  ]);

  console.log("âœ… Quiz questions seeded");

  // â”€â”€ Mock Exam â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [mockQuiz] = await db
    .insert(quizzes)
    .values([
      {
        chapterId: ch1.id,
        title: "Physics Grade 9 Mock Exam 2023",
        durationMinutes: 90,
        totalMarks: 75,
        type: "mock_exam",
      },
    ])
    .returning();

  await db.insert(mockExams).values([
    {
      boardId: boardFBISE.id,
      grade: "9",
      subjectId: subjectPhysics.id,
      quizId: mockQuiz.id,
      title: "Physics Grade 9 Annual Mock Exam",
      year: 2023,
      durationMinutes: 90,
      totalMarks: 75,
    },
  ]);

  console.log("âœ… Mock exams seeded");

  // â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [adminUser, studentAli, studentSara] = await db
    .insert(users)
    .values([
      {
        id: "user_admin_001",
        name: "Admin User",
        email: "admin@example.com",
        emailVerified: true,
        role: "admin",
        class: null,
        degree: "M.Ed",
        board: "fbise",
      },
      {
        id: "user_student_001",
        name: "Ali Hassan",
        email: "ali.hassan@example.com",
        emailVerified: true,
        role: "student",
        class: "9-A",
        degree: null,
        board: "fbise",
      },
      {
        id: "user_student_002",
        name: "Sara Khan",
        email: "sara.khan@example.com",
        emailVerified: true,
        role: "student",
        class: "9-B",
        degree: null,
        board: "fbise",
      },
    ])
    .returning();

  console.log("âœ… Users seeded");

  const seededPasswordHash = await hashPassword("password");
  await db.insert(accounts).values([
    {
      id: "account_admin_001",
      accountId: adminUser.id,
      providerId: "credential",
      userId: adminUser.id,
      password: seededPasswordHash,
    },
    {
      id: "account_student_001",
      accountId: studentAli.id,
      providerId: "credential",
      userId: studentAli.id,
      password: seededPasswordHash,
    },
    {
      id: "account_student_002",
      accountId: studentSara.id,
      providerId: "credential",
      userId: studentSara.id,
      password: seededPasswordHash,
    },
  ]);

  console.log("âœ… Credential accounts seeded");

  // â”€â”€ Quiz Attempts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.insert(quizAttempts).values([
    {
      userId: studentAli.id,
      quizId: quiz1.id,
      answers: { "1": "b", "2": "c", "3": "b" },
      score: 3,
      totalMarks: 3,
    },
    {
      userId: studentSara.id,
      quizId: quiz1.id,
      answers: { "1": "b", "2": "a", "3": "b" },
      score: 2,
      totalMarks: 3,
    },
    {
      userId: studentAli.id,
      quizId: quiz2.id,
      answers: { "4": "b", "5": "c" },
      score: 2,
      totalMarks: 2,
    },
  ]);

  console.log("âœ… Quiz attempts seeded");

  // â”€â”€ User Progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.insert(userProgress).values([
    {
      userId: studentAli.id,
      chapterId: ch1.id,
      exercisesViewed: 3,
      flashcardsCompleted: true,
      quizBestScore: 3,
      quizAttemptsCount: 1,
    },
    {
      userId: studentAli.id,
      chapterId: ch2.id,
      exercisesViewed: 2,
      flashcardsCompleted: false,
      quizBestScore: 2,
      quizAttemptsCount: 1,
    },
    {
      userId: studentSara.id,
      chapterId: ch1.id,
      exercisesViewed: 3,
      flashcardsCompleted: true,
      quizBestScore: 2,
      quizAttemptsCount: 1,
    },
  ]);

  console.log("âœ… User progress seeded");

  // â”€â”€ AI Chat Sessions & Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [session1] = await db
    .insert(aiChatSessions)
    .values([
      {
        userId: studentAli.id,
        chapterId: ch1.id,
        title: "Help with vernier calipers",
      },
    ])
    .returning();

  await db.insert(aiMessages).values([
    {
      sessionId: session1.id,
      role: "user",
      content: "Can you explain how to read a vernier caliper?",
    },
    {
      sessionId: session1.id,
      role: "assistant",
      content:
        "Sure! To read a vernier caliper: 1) Read the main scale to get the whole mm value. 2) Find which vernier division aligns with a main scale division â€“ that's your decimal. 3) Add them together. For example, if the main scale reads 12 mm and the 4th vernier division aligns, the reading is 12.4 mm.",
    },
    {
      sessionId: session1.id,
      role: "user",
      content: "What is its least count?",
    },
    {
      sessionId: session1.id,
      role: "assistant",
      content:
        "The least count of a standard vernier caliper is 0.1 mm, calculated as 1 MSD âˆ’ 1 VSD.",
    },
  ]);

  await db.insert(aiUsageLogs).values([
    {
      userId: studentAli.id,
      sessionId: session1.id,
      model: "claude-sonnet-4-20250514",
      promptTokens: 45,
      completionTokens: 120,
    },
    {
      userId: studentAli.id,
      sessionId: session1.id,
      model: "claude-sonnet-4-20250514",
      promptTokens: 30,
      completionTokens: 55,
    },
  ]);

  console.log("âœ… AI chat sessions & usage logs seeded");

  // â”€â”€ Forum Threads & Replies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [thread1, thread2] = await db
    .insert(forumThreads)
    .values([
      {
        userId: studentAli.id,
        subjectId: subjectPhysics.id,
        chapterId: ch2.id,
        title: "Confused about velocity vs speed",
        body: "Can someone explain the difference between speed and velocity? I keep mixing them up in problems.",
        isPinned: false,
        isSolved: false,
        views: 14,
      },
      {
        userId: studentSara.id,
        subjectId: subjectPhysics.id,
        chapterId: ch1.id,
        title: "How to use a screw gauge correctly?",
        body: "I'm struggling with the backlash error in screw gauge. How do I avoid it?",
        isPinned: true,
        isSolved: true,
        views: 42,
      },
    ])
    .returning();

  const [reply1, reply2] = await db
    .insert(forumReplies)
    .values([
      {
        threadId: thread1.id,
        userId: adminUser.id,
        parentReplyId: null,
        body: "Great question! Speed is a scalar â€“ it only has magnitude (how fast). Velocity is a vector â€“ it has both magnitude and direction. So a car going 60 km/h is speed, but 60 km/h northward is velocity.",
        isAcceptedAnswer: false,
        upvotes: 5,
      },
      {
        threadId: thread2.id,
        userId: adminUser.id,
        parentReplyId: null,
        body: "To avoid backlash error, always approach the final reading from the same direction. Never reverse the thimble when measuring â€“ move it in one direction only.",
        isAcceptedAnswer: true,
        upvotes: 12,
      },
    ])
    .returning();

  // Nested reply
  await db.insert(forumReplies).values([
    {
      threadId: thread1.id,
      userId: studentSara.id,
      parentReplyId: reply1.id,
      body: "This was super helpful, thank you! So distance is scalar and displacement is vector too, right?",
      isAcceptedAnswer: false,
      upvotes: 2,
    },
  ]);

  // Reply votes
  await db.insert(forumReplyVotes).values([
    { userId: studentAli.id, replyId: reply1.id, voteType: "upvote" },
    { userId: studentSara.id, replyId: reply2.id, voteType: "upvote" },
    { userId: studentAli.id, replyId: reply2.id, voteType: "upvote" },
  ]);

  console.log("âœ… Forum threads, replies & votes seeded");

  // â”€â”€ Admin Audit Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Moderation flags
  await db.insert(moderationFlags).values([
    {
      targetType: "thread",
      targetId: thread1.id,
      targetLabel: thread1.title,
      reason: "Abusive language",
      status: "open",
    },
    {
      targetType: "reply",
      targetId: reply1.id,
      targetLabel: "Great question! Speed is a scalar…",
      reason: "Spam",
      status: "open",
    },
    {
      targetType: "chapter",
      targetId: String(ch1.id),
      targetLabel: ch1.title,
      reason: "Outdated content",
      status: "resolved",
      resolvedBy: adminUser.id,
      resolvedAt: new Date(),
      resolutionNote: "Content owner confirmed updated edition was already published.",
    },
  ]);

  console.log("? Moderation flags seeded");
  await db.insert(adminAuditLogs).values([
    {
      scope: "content",
      action: "PUBLISH_CHAPTER",
      target: `chapter:${ch1.id}`,
      status: "success",
      message:
        "Chapter 'Physical Quantities and Measurement' published successfully.",
      actorId: adminUser.id,
      actorName: adminUser.name,
    },
    {
      scope: "content",
      action: "PUBLISH_CHAPTER",
      target: `chapter:${ch2.id}`,
      status: "success",
      message: "Chapter 'Kinematics' published successfully.",
      actorId: adminUser.id,
      actorName: adminUser.name,
    },
    {
      scope: "forum",
      action: "PIN_THREAD",
      target: `thread:${thread2.id}`,
      status: "success",
      message: "Forum thread pinned by admin.",
      actorId: adminUser.id,
      actorName: adminUser.name,
    },
    {
      scope: "content",
      action: "IMPORT_CONTENT",
      target: `content_source:${sourcePhysics.id}`,
      status: "success",
      message: "Physics Grade 9 content imported from PDF (parser v1.0.0).",
      actorId: adminUser.id,
      actorName: adminUser.name,
    },
  ]);

  console.log("âœ… Admin audit logs seeded");
  await db.insert(adminSettings).values([
    {
      key: "forum_auto_lock_hours",
      value: "24",
      description: "Auto-lock inactive forum threads after N hours.",
      updatedBy: adminUser.id,
    },
    {
      key: "quiz_pass_threshold_percent",
      value: "50",
      description: "Minimum score percentage required to pass quizzes.",
      updatedBy: adminUser.id,
    },
    {
      key: "maintenance_banner_enabled",
      value: "false",
      description: "Controls maintenance announcement banner visibility.",
      updatedBy: adminUser.id,
    },
  ]);

  console.log("✅ Admin settings seeded");

  await db.insert(adminNotifications).values([
    {
      title: "Welcome admin team",
      message: "Phase 4 operations are enabled for manual broadcast notifications.",
      audience: "admins",
      status: "sent",
      createdBy: adminUser.id,
    },
  ]);

  console.log("✅ Admin notifications seeded");

  console.log("\nðŸŽ‰ Database seeded successfully!");
  await pool.end();
}

seed().catch((err) => {
  console.error("âŒ Seed failed:", err);
  process.exit(1);
});


