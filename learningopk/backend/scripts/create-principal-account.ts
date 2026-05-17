import { db } from "../src/lib/db/index.js";
import { users, schools } from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

const PRINCIPAL_EMAIL = "principal@ibnesina.edu.pk";
const PRINCIPAL_NAME = "Principal Ahmed Khan";
const PASSWORD = "password";
const SCHOOL_ID = 1;

async function main() {
  // 1. Delete existing principal user if exists
  await db.delete(users).where(eq(users.email, PRINCIPAL_EMAIL));
  console.log("🗑️  Cleared existing principal user");

  // 2. Sign up via Better Auth API
  const backendUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
  const signUpResponse = await fetch(`${backendUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Origin": process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
    },
    body: JSON.stringify({
      email: PRINCIPAL_EMAIL,
      password: PASSWORD,
      name: PRINCIPAL_NAME,
      class: "10",
      board: "punjab",
    }),
  });

  if (!signUpResponse.ok) {
    const error = await signUpResponse.json().catch(() => ({}));
    console.error("❌ Sign-up failed:", error);
    process.exit(1);
  }

  const signUpData = await signUpResponse.json();
  const userId = signUpData.user?.id;

  if (!userId) {
    console.error("❌ No user ID returned from sign-up");
    process.exit(1);
  }

  console.log("✅ Principal signed up:", userId);

  // 3. Update user's school_id and set as school admin
  await db.update(users)
    .set({ schoolId: SCHOOL_ID })
    .where(eq(users.id, userId));

  await db.update(schools)
    .set({ adminUserId: userId })
    .where(eq(schools.id, SCHOOL_ID));

  console.log("\n🎉 Principal account ready!");
  console.log("─────────────────────────────────────────");
  console.log("Email:", PRINCIPAL_EMAIL);
  console.log("Password:", PASSWORD);
  console.log("User ID:", userId);
  console.log("School: Ibn e Sina Public High School");
  console.log("Invite Code: LPK-00EFEC7B");
  console.log("─────────────────────────────────────────\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
