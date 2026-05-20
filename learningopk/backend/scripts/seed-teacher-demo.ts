import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db/index.js";
import {
  users,
  classrooms,
  classroomStudents,
  assignments,
  assignmentSubmissions,
  classroomAnnouncements,
  userProgress,
  quizAttempts,
  chapters,
  quizzes,
} from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

function uid() {
  return randomBytes(16).toString("hex");
}

async function main() {
  console.log("Seeding Teacher Suite demo data...\n");

  // ── 1. Create Teacher ──────────────────────────────────────────────
  const teacherId = uid();
  const ts = Date.now();
  await db.insert(users).values({
    id: teacherId,
    name: "Ms. Fatima Noor",
    email: `teacher-ts-${ts}@demo.pk`,
    emailVerified: true,
    class: "10",
    board: "fbise",
    role: "teacher",
    status: "active",
    xp: 0,
    level: 0,
  });
  console.log(`✅ Teacher created: Ms. Fatima Noor (teacher-ts-${ts}@demo.pk)`);

  // ── 2. Create Classrooms ───────────────────────────────────────────
  const classroom9 = await db
    .insert(classrooms)
    .values({
      teacherId,
      name: "9th Grade Mathematics",
      boardId: 1,
      grade: "9",
      inviteCode: `9A-${ts.toString(36).toUpperCase().slice(-4)}`,
      description: "FBISE 9th class math — covering algebra and geometry",
      isActive: true,
    })
    .returning()
    .then((r) => r[0]!);

  const classroom10 = await db
    .insert(classrooms)
    .values({
      teacherId,
      name: "10th Grade Mathematics",
      boardId: 1,
      grade: "10",
      inviteCode: `10B-${ts.toString(36).toUpperCase().slice(-4)}`,
      description: "FBISE 10th class math — advanced algebra and trigonometry",
      isActive: true,
    })
    .returning()
    .then((r) => r[0]!);

  console.log(`✅ Classrooms created: "${classroom9.name}" (invite: ${classroom9.inviteCode}), "${classroom10.name}" (invite: ${classroom10.inviteCode})`);

  // ── 3. Create Students ─────────────────────────────────────────────
  const studentData = [
    { name: "Ahmed Khan", email: `ahmed-ts-${ts}@student.pk`, class: "9", classroomId: classroom9.id, xp: 1800, level: 9 },
    { name: "Zara Ali", email: `zara-ts-${ts}@student.pk`, class: "9", classroomId: classroom9.id, xp: 2100, level: 10 },
    { name: "Bilal Hassan", email: `bilal-ts-${ts}@student.pk`, class: "9", classroomId: classroom9.id, xp: 1200, level: 7 },
    { name: "Sana Tariq", email: `sana-ts-${ts}@student.pk`, class: "9", classroomId: classroom9.id, xp: 2800, level: 13 },
    { name: "Usman Javed", email: `usman-ts-${ts}@student.pk`, class: "10", classroomId: classroom10.id, xp: 3200, level: 15 },
    { name: "Ayesha Noor", email: `ayesha-ts-${ts}@student.pk`, class: "10", classroomId: classroom10.id, xp: 2500, level: 12 },
    { name: "Hamza Iqbal", email: `hamza-ts-${ts}@student.pk`, class: "10", classroomId: classroom10.id, xp: 1500, level: 8 },
    { name: "Fatima Raza", email: `fatima-ts-${ts}@student.pk`, class: "10", classroomId: classroom10.id, xp: 3900, level: 17 },
  ];

  const studentIds: string[] = [];
  const studentClassMap: Map<string, number> = new Map();

  for (const s of studentData) {
    const id = uid();
    await db.insert(users).values({
      id,
      name: s.name,
      email: s.email,
      emailVerified: true,
      class: s.class,
      board: "fbise",
      role: "student",
      status: "active",
      xp: s.xp,
      level: s.level,
    });

    await db.insert(classroomStudents).values({
      classroomId: s.classroomId,
      studentId: id,
    });

    studentIds.push(id);
    studentClassMap.set(id, s.classroomId);
    console.log(`✅ Student: ${s.name} (Level ${s.level}, ${s.xp} XP) → Classroom ${s.classroomId}`);
  }

  // ── 4. Create Assignments ──────────────────────────────────────────
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const assignmentDefs = [
    { classroomId: classroom9.id, type: "quiz" as const, targetId: 1, title: "Algebra Basics Quiz", points: 20, daysAgo: 14 },
    { classroomId: classroom9.id, type: "quiz" as const, targetId: 2, title: "Geometry Fundamentals", points: 25, daysAgo: 10 },
    { classroomId: classroom9.id, type: "chapter" as const, targetId: 3, title: "Linear Equations Practice", points: 30, daysAgo: 7 },
    { classroomId: classroom9.id, type: "quiz" as const, targetId: 4, title: "Quadratic Equations Quiz", points: 20, daysAgo: 3 },
    { classroomId: classroom10.id, type: "quiz" as const, targetId: 5, title: "Trigonometry Quiz", points: 25, daysAgo: 14 },
    { classroomId: classroom10.id, type: "quiz" as const, targetId: 6, title: "Advanced Algebra", points: 30, daysAgo: 10 },
    { classroomId: classroom10.id, type: "chapter" as const, targetId: 7, title: "Calculus Introduction", points: 35, daysAgo: 5 },
    { classroomId: classroom10.id, type: "mock_exam" as const, targetId: 8, title: "Full Syllabus Mock Exam", points: 100, daysAgo: 2 },
  ];

  const assignmentIds: number[] = [];
  for (const a of assignmentDefs) {
    const inserted = await db
      .insert(assignments)
      .values({
        classroomId: a.classroomId,
        type: a.type,
        targetId: a.targetId,
        title: a.title,
        description: `${a.title} — ${a.points} points`,
        dueDate: new Date(now + 7 * day),
        points: a.points,
      })
      .returning()
      .then((r) => r[0]!);
    assignmentIds.push(inserted.id);
  }
  console.log(`✅ ${assignmentDefs.length} assignments created`);

  // ── 5. Create Submissions with varied scores ───────────────────────
  // Some students score well, some poorly (to trigger struggling-student alerts)
  // Index-aligned with studentData array: each student gets scores for their classroom's assignments
  const scorePatterns: number[][] = [
    // Grade 9 students (classroom9 has assignments at indices 0,1,2,3)
    [16, 20, 22, 8],     // Ahmed: 80%, 80%, 73%, 40% — last one below 50%
    [18, 22, 28, 18],    // Zara: 90%, 88%, 93%, 90% — strong
    [6, 8, 10, 4],        // Bilal: 30%, 32%, 33%, 20% — struggling!
    [20, 24, 30, 16],     // Sana: 100%, 96%, 100%, 80% — excellent
    // Grade 10 students (classroom10 has assignments at indices 4,5,6,7)
    [22, 27, 30, 85],     // Usman: 88%, 90%, 85%, 85% — strong
    [15, 18, 22, 60],     // Ayesha: 60%, 60%, 62%, 60% — borderline
    [5, 8, 10, 25],        // Hamza: 20%, 26%, 28%, 25% — struggling!
    [24, 30, 35, 98],      // Fatima: 96%, 100%, 100%, 98% — excellent
  ];

  for (let si = 0; si < studentData.length; si++) {
    const s = studentData[si]!;
    const scores = scorePatterns[si]!;
    const studentId = studentIds[si]!;
    const classroomAssignments = assignmentDefs.filter((a) => a.classroomId === s.classroomId);

    for (let i = 0; i < classroomAssignments.length; i++) {
      const def = classroomAssignments[i]!;
      const aIdx = assignmentDefs.indexOf(def);
      const assignmentId = assignmentIds[aIdx]!;
      const score = scores[i]!;
      const status = score > 0 ? "submitted" as const : "not_started" as const;
      const daysAgo = def.daysAgo;

      await db
        .insert(assignmentSubmissions)
        .values({
          assignmentId,
          studentId,
          status,
          score,
          submittedAt: status === "submitted" ? new Date(now - daysAgo * day) : null,
        })
        .onConflictDoUpdate({
          target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
          set: { status, score },
        });
    }
  }
  console.log("✅ Submissions seeded (varied scores for struggling-student detection)");

  // ── 6. Seed Quiz Attempts + UserProgress (for getClassReadiness) ──
  const chapterRows = await db.select({ id: chapters.id, title: chapters.title }).from(chapters).limit(8);
  // Get actual quiz IDs (required for FK constraint on quizAttempts.quizId)
  const quizRows = await db.select({ id: quizzes.id, chapterId: quizzes.chapterId }).from(quizzes);
  const quizByChapter = new Map<number, number>();
  for (const q of quizRows) {
    if (!quizByChapter.has(q.chapterId)) quizByChapter.set(q.chapterId, q.id);
  }
  console.log(`📚 Found ${chapterRows.length} chapters, ${quizRows.length} quizzes for progress seeding`);

  let scoreIdx = 0;
  for (const studentId of studentIds) {
    for (let ci = 0; ci < Math.min(4, chapterRows.length); ci++) {
      const chapter = chapterRows[ci]!;
      const quizId = quizByChapter.get(chapter.id);
      if (!quizId) continue; // skip chapters with no quizzes
      // Varying scores: some strong, some weak
      const bases = [85, 72, 45, 38, 90, 65, 28, 95];
      const quizScore = Math.min(100, Math.max(15, bases[scoreIdx % bases.length]! + Math.floor(Math.random() * 10 - 5)));

      await db
        .insert(userProgress)
        .values({
          userId: studentId,
          chapterId: chapter.id,
          visitedAt: new Date(now - Math.floor(Math.random() * 30 * day)),
          summaryRead: true,
          quizBestScore: quizScore,
          quizAttemptsCount: Math.floor(Math.random() * 3) + 1,
        })
        .onConflictDoNothing();

      await db.insert(quizAttempts).values({
        userId: studentId,
        quizId,
        type: "chapter_quiz",
        answers: { q1: "a", q2: "b" },
        score: quizScore,
        totalMarks: 100,
        startedAt: new Date(now - Math.floor(Math.random() * 7 * day)),
        completedAt: new Date(),
      });
    }
    scoreIdx++;
  }
  console.log("✅ Quiz attempts and user progress seeded");

  // ── 7. Create Announcements ────────────────────────────────────────
  const announcements = [
    { classroomId: classroom9.id, content: "Welcome to 9th Grade Math! Please review the Algebra Basics assignment.", pinned: true },
    { classroomId: classroom9.id, content: "Reminder: Geometry quiz due this Friday. Office hours Thursday 3-4 PM.", pinned: false },
    { classroomId: classroom9.id, content: "Great work on Linear Equations! Average class score: 78%. Keep it up!", pinned: false },
    { classroomId: classroom10.id, content: "Welcome to 10th Grade Math! Mock exam scheduled for end of month.", pinned: true },
    { classroomId: classroom10.id, content: "Trigonometry scores posted. See me if you scored below 60% for extra practice.", pinned: false },
  ];

  for (const a of announcements) {
    await db.insert(classroomAnnouncements).values({
      classroomId: a.classroomId,
      teacherId,
      content: a.content,
      pinned: a.pinned,
    });
  }
  console.log(`✅ ${announcements.length} announcements created`);

  // ── 8. Summary ─────────────────────────────────────────────────────
  console.log("\n🎉 Teacher Suite seeding complete!");
  console.log("\n─────────────────────────────────────────");
  console.log("Teacher:   Ms. Fatima Noor (teacher@demo.pk)");
  console.log(`Classroom: "${classroom9.name}" — invite: ${classroom9.inviteCode}`);
  console.log(`Classroom: "${classroom10.name}" — invite: ${classroom10.inviteCode}`);
  console.log("Students: ", studentIds.length);
  console.log("─────────────────────────────────────────");
  console.log("\n📊 Struggling students (avg quiz < 50%):");
  console.log("   • Bilal Hassan (30%, 32%, 33%, 20%) — needs intervention");
  console.log("   • Hamza Iqbal (20%, 26%, 28%, 25%) — needs intervention");
  console.log("\n📊 Borderline students (avg quiz 50-70%):");
  console.log("   • Ayesha Noor (60%, 60%, 62%, 60%) — monitor");
  console.log("─────────────────────────────────────────\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
