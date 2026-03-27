import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import * as schema from "./src/lib/db/schema.js";
import { clearDatabase } from "./src/lib/db/clear-database.js";
import {
  accounts,
  boards,
  boardClasses,
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

  const [fbiseClass9, fbiseClass10, punjabClass9, punjabClass10] = await db
    .insert(boardClasses)
    .values([
      { boardId: boardFBISE.id, name: "9th", slug: "9th" },
      { boardId: boardFBISE.id, name: "10th", slug: "10th" },
      { boardId: boardPunjab.id, name: "9th", slug: "9th" },
      { boardId: boardPunjab.id, name: "10th", slug: "10th" },
    ])
    .returning();

  console.log("âœ… Classes seeded");

  // â”€â”€ Subjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [subjectPhysics, subjectChem, subjectBio, subjectMath] = await db
    .insert(subjects)
    .values([
      {
        boardId: boardFBISE.id,
        boardClassId: fbiseClass9.id,
        grade: "9",
        name: "Physics",
        slug: "physics",
        icon: "âš›ï¸",
        description: "Fundamentals of physics for grade 9 students.",
      },
      {
        boardId: boardFBISE.id,
        boardClassId: fbiseClass9.id,
        grade: "9",
        name: "Chemistry",
        slug: "chemistry",
        icon: "ðŸ§ª",
        description: "Introduction to chemistry concepts.",
      },
      {
        boardId: boardFBISE.id,
        boardClassId: fbiseClass10.id,
        grade: "10",
        name: "Biology",
        slug: "biology",
        icon: "ðŸ§¬",
        description: "Life sciences for grade 10.",
      },
      {
        boardId: boardPunjab.id,
        boardClassId: punjabClass9.id,
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
      durationMinutes: 120,
      totalMarks: 75,
    },
  ]);

  // Add 70 mock exam questions across chapters (40 from ch1, 30 from ch2)
  await db.insert(quizQuestions).values([
    // Chapter 1 - Physical Quantities and Measurement (40 questions)
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which of the following is a base SI unit?", optionA: "Newton", optionB: "Kilogram", optionC: "Joule", optionD: "Watt", correctOption: "b", explanation: "Kilogram (kg) is one of the 7 base SI units. Newton, Joule, and Watt are derived units.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The least count of a vernier caliper is:", optionA: "0.001 mm", optionB: "0.01 mm", optionC: "0.1 mm", optionD: "1 mm", correctOption: "c", explanation: "The least count of a standard vernier caliper is 0.1 mm.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is the dimension of force?", optionA: "MLT-1", optionB: "MLT-2", optionC: "ML2T-1", optionD: "ML2T-2", correctOption: "b", explanation: "Force = mass x acceleration = MLT-2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which instrument is used to measure very small lengths accurately?", optionA: "Meter rule", optionB: "Vernier caliper", optionC: "Measuring tape", optionD: "Odometer", correctOption: "b", explanation: "Vernier caliper can measure lengths up to 0.1 mm accuracy.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The precision of a measurement depends on:", optionA: "Instrument quality only", optionB: "Observer skill only", optionC: "Both instrument and observer", optionD: "None of these", correctOption: "c", explanation: "Precision depends on both the instrument quality and observer skill.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "How many significant figures are in 0.00670?", optionA: "2", optionB: "3", optionC: "4", optionD: "5", correctOption: "b", explanation: "0.00670 has 3 significant figures (6, 7, and 0).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which of the following is a derived quantity?", optionA: "Mass", optionB: "Length", optionC: "Time", optionD: "Force", correctOption: "d", explanation: "Force is a derived quantity as it is derived from mass, length, and time.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The accuracy of a measurement refers to:", optionA: "Closeness to true value", optionB: "Reproducibility", optionC: "Smallest division", optionD: "Maximum measurement", correctOption: "a", explanation: "Accuracy is how close a measured value is to the true value.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is 1 micron equal to?", optionA: "10-6 m", optionB: "10-3 m", optionC: "10-9 m", optionD: "10-12 m", correctOption: "a", explanation: "1 micron = 10-6 meters.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A screw gauge has 100 divisions on its circular scale. If the pitch is 1 mm, what is its least count?", optionA: "0.001 mm", optionB: "0.01 mm", optionC: "0.1 mm", optionD: "1 mm", correctOption: "b", explanation: "Least count = Pitch/Number of divisions = 1mm/100 = 0.01mm.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which physical quantity has the dimension ML-1T-2?", optionA: "Force", optionB: "Pressure", optionC: "Work", optionD: "Power", correctOption: "b", explanation: "Pressure = Force/Area = MLT-2/L2 = ML-1T-2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The zero error in a measuring instrument causes:", optionA: "Systematic error", optionB: "Random error", optionC: "Gross error", optionD: "None", correctOption: "a", explanation: "Zero error is a systematic error that shifts all measurements.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is the unit of luminous intensity?", optionA: "Candela", optionB: "Lumen", optionC: "Lux", optionD: "Watt", correctOption: "a", explanation: "Candela (cd) is the SI unit of luminous intensity.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A measuring cylinder is used to measure:", optionA: "Mass of liquids", optionB: "Volume of liquids", optionC: "Density of solids", optionD: "Pressure", correctOption: "b", explanation: "Measuring cylinder is used to measure the volume of liquids.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which of the following is not a fundamental quantity?", optionA: "Length", optionB: "Mass", optionC: "Density", optionD: "Time", correctOption: "c", explanation: "Density is derived from mass and volume.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The random errors can be reduced by:", optionA: "Taking multiple readings", optionB: "Using better instrument", optionC: "Calibrating instrument", optionD: "None", correctOption: "a", explanation: "Random errors can be reduced by taking the mean of multiple readings.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is the dimension of work?", optionA: "ML2T-2", optionB: "MLT-2", optionC: "ML2T-1", optionD: "MLT-1", correctOption: "a", explanation: "Work = Force x Distance = MLT-2 x L = ML2T-2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A physical balance measures:", optionA: "Weight", optionB: "Mass", optionC: "Density", optionD: "Volume", correctOption: "b", explanation: "Physical balance measures mass by comparison with standard masses.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which of the following has highest precision?", optionA: "Ruler", optionB: "Vernier caliper", optionC: "Screw gauge", optionD: "Meter scale", correctOption: "c", explanation: "Screw gauge has least count of 0.01mm, highest precision.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The prefix 'nano' represents:", optionA: "10-6", optionB: "10-9", optionC: "10-3", optionD: "10-12", correctOption: "b", explanation: "nano = 10-9.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is 1 angstrom equal to?", optionA: "10-6 m", optionB: "10-8 m", optionC: "10-10 m", optionD: "10-12 m", correctOption: "c", explanation: "1 angstrom = 10-10 meters.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which error is caused by poor calibration of instrument?", optionA: "Random error", optionB: "Systematic error", optionC: "Human error", optionD: "None", correctOption: "b", explanation: "Poor calibration causes systematic errors.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The mass of an object is measured using:", optionA: "Spring balance", optionB: "Physical balance", optionC: "Barometer", optionD: "Manometer", correctOption: "b", explanation: "Physical balance compares masses directly.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is the dimension of pressure?", optionA: "MLT-2", optionB: "ML-1T-2", optionC: "ML2T-2", optionD: "ML-1T-1", correctOption: "b", explanation: "Pressure = Force/Area = MLT-2/L2 = ML-1T-2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The accuracy of stopwatch is usually:", optionA: "1 second", optionB: "0.1 second", optionC: "0.01 second", optionD: "1 millisecond", correctOption: "b", explanation: "Stopwatch typically has accuracy of 0.1 second.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Significant figures in 0.0500 are:", optionA: "2", optionB: "3", optionC: "4", optionD: "5", correctOption: "b", explanation: "0.0500 has 3 significant figures (5, 0, and last 0).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A foot rule has divisions up to 1 mm. Its least count is:", optionA: "1 mm", optionB: "0.1 mm", optionC: "0.5 mm", optionD: "10 mm", correctOption: "a", explanation: "Least count of foot rule is 1mm.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which of the following is a scalar quantity?", optionA: "Force", optionB: "Velocity", optionC: "Acceleration", optionD: "Work", correctOption: "d", explanation: "Work is a scalar quantity (has magnitude only).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The dimension of density is:", optionA: "ML-3", optionB: "ML3", optionC: "ML-1T-2", optionD: "ML2T-2", correctOption: "a", explanation: "Density = Mass/Volume = M/L3 = ML-3.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A beam balance measures:", optionA: "Weight", optionB: "Mass", optionC: "Force", optionD: "Pressure", correctOption: "b", explanation: "Beam balance measures mass by comparing with standard masses.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What type of error is parallax error?", optionA: "Systematic", optionB: "Random", optionC: "Gross", optionD: "None", correctOption: "a", explanation: "Parallax error is a systematic error due to wrong viewing angle.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The SI unit of temperature is:", optionA: "Degree Celsius", optionB: "Degree Fahrenheit", optionC: "Kelvin", optionD: "Rankine", correctOption: "c", explanation: "Kelvin is the SI unit of temperature.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which instrument is used to measure internal diameter of a tube?", optionA: "Meter rule", optionB: "Vernier caliper", optionC: "Measuring tape", optionD: "Slide caliper", correctOption: "b", explanation: "Vernier caliper can measure internal diameters.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Precision of measurement is indicated by:", optionA: "Significant figures", optionB: "Unit", optionC: "Dimension", optionD: "None", correctOption: "a", explanation: "Significant figures indicate the precision of measurement.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "What is the dimension of power?", optionA: "ML2T-3", optionB: "MLT-2", optionC: "ML2T-2", optionD: "ML-1T-3", correctOption: "a", explanation: "Power = Work/Time = ML2T-2/T = ML2T-3.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A physical quantity which cannot be negative is:", optionA: "Velocity", optionB: "Acceleration", optionC: "Mass", optionD: "Displacement", correctOption: "c", explanation: "Mass is always positive (scalar quantity).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The least count of a micrometer screw gauge is typically:", optionA: "0.001 mm", optionB: "0.01 mm", optionC: "0.1 mm", optionD: "1 mm", correctOption: "b", explanation: "Standard micrometer has least count 0.01mm.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which prefix means 10^6?", optionA: "Kilo", optionB: "Mega", optionC: "Giga", optionD: "Tera", correctOption: "b", explanation: "Mega = 10^6, Kilo = 10^3.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "The measurement 5.00 kg has how many significant figures?", optionA: "1", optionB: "2", optionC: "3", optionD: "4", correctOption: "c", explanation: "All three digits (5, 0, 0) are significant.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "A spring balance measures:", optionA: "Mass", optionB: "Weight", optionC: "Volume", optionD: "Density", correctOption: "b", explanation: "Spring balance measures weight (force of gravity).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch1.id, question: "Which is a vector quantity?", optionA: "Work", optionB: "Energy", optionC: "Force", optionD: "Time", correctOption: "c", explanation: "Force has both magnitude and direction - it is a vector.", marks: 1 },
    // Chapter 2 - Kinematics (30 questions)
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A car moves with uniform velocity. Its acceleration is:", optionA: "Positive", optionB: "Negative", optionC: "Zero", optionD: "Variable", correctOption: "c", explanation: "Uniform velocity means no change in velocity, so acceleration = 0.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The slope of distance-time graph gives:", optionA: "Acceleration", optionB: "Velocity", optionC: "Displacement", optionD: "Speed", correctOption: "b", explanation: "Slope of distance-time graph = velocity.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "Which of the following is the unit of acceleration?", optionA: "m/s", optionB: "m/s2", optionC: "m2/s", optionD: "m/s3", correctOption: "b", explanation: "Acceleration = change in velocity/time = m/s2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A body moving in a circle has:", optionA: "Uniform velocity", optionB: "Uniform speed", optionC: "Zero acceleration", optionD: "Uniform displacement", correctOption: "b", explanation: "Uniform circular motion has uniform speed but changing velocity.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The area under velocity-time graph represents:", optionA: "Acceleration", optionB: "Displacement", optionC: "Distance", optionD: "Speed", correctOption: "b", explanation: "Area under v-t graph = displacement.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A ball is thrown upward. Its acceleration at the highest point is:", optionA: "Zero", optionB: "9.8 m/s2 downward", optionC: "9.8 m/s2 upward", optionD: "Infinite", correctOption: "b", explanation: "Acceleration due to gravity is always downward (9.8 m/s2).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The first equation of motion is:", optionA: "v = u + at", optionB: "s = ut + 1/2at2", optionC: "v2 = u2 + 2as", optionD: "s = vt", correctOption: "a", explanation: "First equation of motion: v = u + at.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A car accelerates from rest at 2 m/s2. Its velocity after 5 seconds is:", optionA: "10 m/s", optionB: "7 m/s", optionC: "2.5 m/s", optionD: "0.4 m/s", correctOption: "a", explanation: "v = u + at = 0 + 2 x 5 = 10 m/s.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "Which quantity is scalar?", optionA: "Velocity", optionB: "Acceleration", optionC: "Displacement", optionD: "Speed", correctOption: "d", explanation: "Speed is scalar (magnitude only); velocity is vector.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A body covers 20m in first second and 60m in next second. Its acceleration is:", optionA: "20 m/s2", optionB: "40 m/s2", optionC: "10 m/s2", optionD: "60 m/s2", correctOption: "a", explanation: "Using equations: for t=1: 20 = u + a/2, for t=2: 80 = 2u + 2a. Solving gives a = 20 m/s2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The slope of velocity-time graph gives:", optionA: "Distance", optionB: "Displacement", optionC: "Acceleration", optionD: "Speed", correctOption: "c", explanation: "Slope of velocity-time graph = acceleration.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A car moving with velocity 20 m/s stops in 4 seconds. The retardation is:", optionA: "5 m/s2", optionB: "80 m/s2", optionC: "0.2 m/s2", optionD: "4 m/s2", correctOption: "a", explanation: "a = (v-u)/t = (0-20)/4 = -5 m/s2 (retardation).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "Displacement is a:", optionA: "Scalar quantity", optionB: "Vector quantity", optionC: "Neither", optionD: "Both", correctOption: "b", explanation: "Displacement has both magnitude and direction - it is a vector.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A body thrown vertically upward returns to ground with:", optionA: "Same velocity", optionB: "Higher velocity", optionC: "Same speed", optionD: "Zero speed", correctOption: "c", explanation: "By conservation of energy, it returns with same speed.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The third equation of motion is:", optionA: "v = u + at", optionB: "s = ut + 1/2at2", optionC: "v2 = u2 + 2as", optionD: "s = vt", correctOption: "c", explanation: "Third equation of motion: v2 = u2 + 2as.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A train travels 100m in 5s. Its average speed is:", optionA: "20 m/s", optionB: "500 m/s", optionC: "0.05 m/s", optionD: "50 m/s", correctOption: "a", explanation: "Average speed = distance/time = 100/5 = 20 m/s.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "When a body moves with constant speed, its acceleration is:", optionA: "Constant", optionB: "Zero", optionC: "Increasing", optionD: "Decreasing", correctOption: "b", explanation: "Constant speed means no change in velocity, so a = 0.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A particle moves 3m east then 4m north. Its displacement is:", optionA: "7m", optionB: "5m", optionC: "1m", optionD: "12m", correctOption: "b", explanation: "Displacement = square root of (3^2 + 4^2) = 5m.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The second equation of motion is:", optionA: "v = u + at", optionB: "s = ut + 1/2at2", optionC: "v2 = u2 + 2as", optionD: "s = vt", correctOption: "b", explanation: "Second equation of motion: s = ut + 1/2at2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A car accelerates at 3 m/s2 from rest. Distance covered in 4s is:", optionA: "12m", optionB: "24m", optionC: "48m", optionD: "6m", correctOption: "b", explanation: "s = 1/2at^2 = 1/2 x 3 x 16 = 24m.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "Uniform circular motion involves:", optionA: "Constant velocity", optionB: "Constant acceleration", optionC: "Changing velocity", optionD: "Zero speed", correctOption: "c", explanation: "Direction changes continuously, so velocity changes.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The ratio of distance to displacement is always:", optionA: "1", optionB: "Greater than 1", optionC: "Less than 1", optionD: "Zero", correctOption: "b", explanation: "Distance is greater than or equal to displacement, so ratio is greater than or equal to 1.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A body moving with uniform retardation stops after covering 20m. Initial velocity 10 m/s. Retardation is:", optionA: "2.5 m/s2", optionB: "5 m/s2", optionC: "10 m/s2", optionD: "0.5 m/s2", correctOption: "a", explanation: "v^2 = u^2 + 2as: 0 = 100 + 2a(20), a = -2.5 m/s2.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "Speed is:", optionA: "Vector quantity", optionB: "Scalar quantity", optionC: "Neither", optionD: "Both", correctOption: "b", explanation: "Speed is scalar - only magnitude, no direction.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A ball dropped from height h reaches ground in 1s. Height is (g=10 m/s2):", optionA: "10m", optionB: "5m", optionC: "20m", optionD: "15m", correctOption: "b", explanation: "s = 1/2gt^2 = 1/2 x 10 x 1 = 5m.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The instantaneous velocity is:", optionA: "Average velocity", optionB: "Velocity at any instant", optionC: "Constant velocity", optionD: "Zero velocity", correctOption: "b", explanation: "Instantaneous velocity is velocity at a specific instant.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A car moves with constant acceleration 2 m/s2. Velocity increase per second is:", optionA: "1 m/s", optionB: "2 m/s", optionC: "4 m/s", optionD: "0.5 m/s", correctOption: "b", explanation: "Acceleration = 2 m/s2 means velocity increases by 2 m/s each second.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The motion of a simple pendulum is:", optionA: "Linear", optionB: "Curvilinear", optionC: "Oscillatory", optionD: "Circular", correctOption: "c", explanation: "Simple pendulum exhibits oscillatory motion.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "A cyclist covers 100m in 20s. His speed in km/h is:", optionA: "5 km/h", optionB: "18 km/h", optionC: "20 km/h", optionD: "50 km/h", correctOption: "b", explanation: "Speed = 100/20 = 5 m/s = 5 x 3.6 = 18 km/h.", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "If a body moves with zero acceleration, it:", optionA: "Must be at rest", optionB: "Moves with constant velocity", optionC: "Must be accelerating", optionD: "Has variable speed", correctOption: "b", explanation: "Zero acceleration means constant velocity (could be moving).", marks: 1 },
    { quizId: mockQuiz.id, chapterId: ch2.id, question: "The unit of velocity is:", optionA: "m/s2", optionB: "m/s", optionC: "m", optionD: "s/m", correctOption: "b", explanation: "Velocity = displacement/time = m/s.", marks: 1 }
  ]);

  console.log("Mock exam questions seeded");

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
        class: "9th",
        degree: null,
        board: "fbise",
      },
      {
        id: "user_student_002",
        name: "Sara Khan",
        email: "sara.khan@example.com",
        emailVerified: true,
        role: "student",
        class: "9th",
        degree: null,
        board: "fbise",
      },
      {
        id: "user_student_003",
        name: "Omar Saeed",
        email: "omar.saeed@example.com",
        emailVerified: true,
        role: "student",
        class: "10th",
        degree: null,
        board: "fbise",
        status: "suspended",
        suspendedReason: "Seeded suspended account for admin lifecycle e2e coverage.",
        suspendedBy: "user_admin_001",
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


