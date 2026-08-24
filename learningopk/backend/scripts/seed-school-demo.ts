import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db/index.js";
import { users, schools, userProgress, quizAttempts, chapters } from "../src/lib/db/schema.js";
import { eq, and } from "drizzle-orm";

const SCHOOL_ID = 1;
const INVITE_CODE = "LPK-00EFEC7B";

function generateUserId() {
  return randomBytes(16).toString("hex");
}

async function main() {
  console.log("Seeding Ibn e Sina Public High School with demo data...\n");

  // ── 1. Create Principal (School Admin) ─────────────────────────────
  const principalId = generateUserId();
  await db.insert(users).values({
    id: principalId,
    name: "Principal Ahmed Khan",
    email: "principal@ibnesina.edu.pk",
    emailVerified: true,
    class: "10",
    board: "punjab",
    schoolId: SCHOOL_ID,
    role: "student",
    status: "active",
    xp: 0,
    level: 0,
  });
  await db.update(schools).set({ adminUserId: principalId }).where(eq(schools.id, SCHOOL_ID));
  console.log("✅ Principal created:", principalId);

  // ── 2. Create Students ─────────────────────────────────────────────
  const studentData = [
    { name: "Ayesha Malik", email: "ayesha@student.pk", class: "10", xp: 2450, level: 12 },
    { name: "Hassan Raza", email: "hassan@student.pk", class: "10", xp: 3200, level: 15 },
    { name: "Fatima Zahra", email: "fatima@student.pk", class: "9", xp: 1800, level: 9 },
    { name: "Usman Ali", email: "usman@student.pk", class: "9", xp: 2100, level: 10 },
    { name: "Maryam Khan", email: "maryam@student.pk", class: "10", xp: 2800, level: 14 },
    { name: "Bilal Ahmed", email: "bilal@student.pk", class: "9", xp: 1500, level: 8 },
    { name: "Sanaullah Khan", email: "sana@student.pk", class: "10", xp: 1950, level: 10 },
    { name: "Zainab Bibi", email: "zainab@student.pk", class: "9", xp: 2300, level: 11 },
  ];

  const studentIds: string[] = [];
  for (const s of studentData) {
    const id = generateUserId();
    await db.insert(users).values({
      id,
      name: s.name,
      email: s.email,
      emailVerified: true,
      class: s.class,
      board: "punjab",
      schoolId: SCHOOL_ID,
      role: "student",
      status: "active",
      xp: s.xp,
      level: s.level,
    });
    studentIds.push(id);
    console.log(`✅ Student created: ${s.name} (Level ${s.level}, ${s.xp} XP)`);
  }

  // ── 3. Get chapters for quiz/progress seeding ──────────────────────
  const chapterRows = await db
    .select({ id: chapters.id, title: chapters.title })
    .from(chapters)
    .limit(10);
  console.log(`\n📚 Found ${chapterRows.length} chapters for quiz seeding`);

  // ── 4. Create quiz attempts and progress for realism ───────────────
  let idx = 0;
  for (const studentId of studentIds) {
    const baseScore = 40 + idx * 8; // Varying scores: 48, 56, 64, 72, 80, 88, 96, 100
    idx++;

    for (const chapter of chapterRows.slice(0, 5)) {
      // Create user progress
      const quizScore = Math.min(
        100,
        Math.max(30, baseScore + Math.floor(Math.random() * 20 - 10))
      );
      const visited = Math.random() > 0.2; // 80% visited

      if (visited) {
        await db
          .insert(userProgress)
          .values({
            userId: studentId,
            chapterId: chapter.id,
            visitedAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
            summaryRead: Math.random() > 0.3,
            subpartsReadCount: Math.floor(Math.random() * 5),
            exercisesViewed: Math.floor(Math.random() * 10),
            flashcardsCompleted: Math.random() > 0.5,
            quizBestScore: quizScore,
            quizAttemptsCount: Math.floor(Math.random() * 3) + 1,
          })
          .onConflictDoNothing();

        // Create quiz attempt
        await db.insert(quizAttempts).values({
          userId: studentId,
          quizId: chapter.id, // Using chapter id as quiz id for demo
          type: "chapter_quiz",
          answers: { q1: "a", q2: "b", q3: "c" },
          score: quizScore,
          totalMarks: 100,
          startedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
          completedAt: new Date(),
        });
      }
    }
  }

  console.log("\n✅ Quiz attempts and progress seeded");

  // ── 5. Update student count ────────────────────────────────────────
  await db
    .update(schools)
    .set({ studentCount: studentIds.length })
    .where(eq(schools.id, SCHOOL_ID));

  console.log("\n🎉 Seeding complete!");
  console.log("\n─────────────────────────────────────────");
  console.log("School: Ibn e Sina Public High School");
  console.log("Invite Code:", INVITE_CODE);
  console.log("Students:", studentIds.length);
  console.log("Principal ID:", principalId);
  console.log("─────────────────────────────────────────\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
