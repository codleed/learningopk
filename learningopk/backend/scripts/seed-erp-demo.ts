import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../src/lib/db/index.js";
import { schools, users } from "../src/lib/db/schema.js";
import { erpRoles, erpUserRoles } from "../src/lib/db/schema/erp/core.js";
import {
  erpDepartments,
  erpPositions,
  erpEmployees,
  erpAttendanceRecords,
  erpTimeOffPolicies,
  erpTimeOffRequests,
  erpOfficialHolidays,
  erpSalaryStructures,
  erpExpenseCategories,
  erpExpenses,
} from "../src/lib/db/schema/erp/hrm.js";
import {
  erpContacts,
  erpPipelines,
  erpPipelineStages,
  erpDeals,
} from "../src/lib/db/schema/erp/crm.js";
import {
  erpFeeStructures,
  erpFeeComponents,
  erpInvoices,
  erpInvoiceItems,
  erpPayments,
} from "../src/lib/db/schema/erp/finance.js";
import {
  erpAcademicYears,
  erpTerms,
  erpSchoolClasses,
  erpEnrollments,
  erpClassSubjects,
  erpTimetableSlots,
  erpExams,
  erpGrades,
  erpStudentAttendance,
} from "../src/lib/db/schema/erp/academics.js";
import { erpApprovalPolicies, erpRequestApprovals } from "../src/lib/db/schema/erp/approvals.js";
import { seedSystemRolesForSchool } from "../src/lib/erp/permissions.js";
import { ERP_SYSTEM_ROLES } from "@learningopk/shared";

function uid() {
  return randomBytes(16).toString("hex");
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function main() {
  const ts = Date.now();
  console.log("Seeding School ERP demo data...\n");

  // ── 1. School + principal ─────────────────────────────────────────
  let school = (
    await db.select().from(schools).where(eq(schools.slug, "erp-demo-school")).limit(1)
  )[0];

  if (!school) {
    const principalId = uid();
    await db.insert(users).values({
      id: principalId,
      name: "Ayesha Siddiqui (Principal)",
      email: `principal-erp-${ts}@demo.pk`,
      emailVerified: true,
      class: "10",
      board: "fbise",
      role: "teacher",
      status: "active",
      xp: 0,
      level: 0,
    });
    const inserted = await db
      .insert(schools)
      .values({
        name: "ERP Demo School",
        slug: "erp-demo-school",
        board: "fbise",
        inviteCode: "LPK-ERPDEMO01",
        adminUserId: principalId,
      })
      .returning();
    school = inserted[0]!;
    await db.update(users).set({ schoolId: school.id }).where(eq(users.id, principalId));
    console.log(`✅ School + principal created: ${school.name}`);
  } else {
    console.log(`ℹ️  School already exists: ${school.name} — adding ERP data only`);
  }
  const schoolId = school.id;

  // ── 2. System roles (RBAC) ─────────────────────────────────────────
  await seedSystemRolesForSchool(schoolId);
  console.log("✅ System roles seeded");

  // ── 3. Demo staff users ────────────────────────────────────────────
  const staffSpecs = [
    { name: "Sana Malik", email: `hr-erp-${ts}@demo.pk`, roleKey: "erp_admin" },
    { name: "Bilal Ahmed", email: `finance-erp-${ts}@demo.pk`, roleKey: "erp_finance" },
    { name: "Tariq Mehmood", email: `staff-erp-${ts}@demo.pk`, roleKey: "erp_staff" },
  ] as const;

  const staffUserIds: Record<string, string> = {};
  for (const spec of staffSpecs) {
    const userId = uid();
    await db.insert(users).values({
      id: userId,
      name: spec.name,
      email: spec.email,
      emailVerified: true,
      class: "10",
      board: "fbise",
      role: "teacher",
      status: "active",
      xp: 0,
      level: 0,
      schoolId,
    });
    const roleRow = (
      await db
        .select({ id: erpRoles.id })
        .from(erpRoles)
        .where(and(eq(erpRoles.schoolId, schoolId), eq(erpRoles.key, spec.roleKey)))
        .limit(1)
    )[0];
    if (roleRow) {
      await db.insert(erpUserRoles).values({ schoolId, userId, roleId: roleRow.id });
    }
    staffUserIds[spec.roleKey] = userId;
  }
  console.log(
    `✅ Staff users + role assignments (${Object.keys(ERP_SYSTEM_ROLES).length} system roles available)`
  );

  // ── 4. HRM: departments, positions, employees ────────────────────────
  const departmentNames = ["Mathematics", "Science", "Administration", "Finance"];
  const departmentIds: Record<string, number> = {};
  for (const name of departmentNames) {
    const existing = (
      await db
        .select({ id: erpDepartments.id })
        .from(erpDepartments)
        .where(and(eq(erpDepartments.schoolId, schoolId), eq(erpDepartments.name, name)))
        .limit(1)
    )[0];
    if (existing) {
      departmentIds[name] = existing.id;
      continue;
    }
    const inserted = await db
      .insert(erpDepartments)
      .values({ schoolId, name, description: `${name} department` })
      .returning({ id: erpDepartments.id });
    departmentIds[name] = inserted[0]!.id;
  }

  const positionNames = ["Senior Teacher", "Teacher", "Clerk", "Accountant"];
  const positionIds: Record<string, number> = {};
  for (const name of positionNames) {
    const existing = (
      await db
        .select({ id: erpPositions.id })
        .from(erpPositions)
        .where(and(eq(erpPositions.schoolId, schoolId), eq(erpPositions.name, name)))
        .limit(1)
    )[0];
    if (existing) {
      positionIds[name] = existing.id;
      continue;
    }
    const inserted = await db
      .insert(erpPositions)
      .values({ schoolId, name })
      .returning({ id: erpPositions.id });
    positionIds[name] = inserted[0]!.id;
  }

  const employeeSpecs = [
    {
      code: "EMP-0001",
      first: "Sana",
      last: "Malik",
      dept: "Administration",
      pos: "Clerk",
      userId: staffUserIds["erp_admin"]!,
    },
    {
      code: "EMP-0002",
      first: "Bilal",
      last: "Ahmed",
      dept: "Finance",
      pos: "Accountant",
      userId: staffUserIds["erp_finance"]!,
    },
    {
      code: "EMP-0003",
      first: "Tariq",
      last: "Mehmood",
      dept: "Administration",
      pos: "Clerk",
      userId: staffUserIds["erp_staff"]!,
    },
    {
      code: "EMP-0004",
      first: "Fatima",
      last: "Noor",
      dept: "Mathematics",
      pos: "Senior Teacher",
      userId: null,
    },
    {
      code: "EMP-0005",
      first: "Imran",
      last: "Khan",
      dept: "Science",
      pos: "Teacher",
      userId: null,
    },
    {
      code: "EMP-0006",
      first: "Hina",
      last: "Raza",
      dept: "Mathematics",
      pos: "Teacher",
      userId: null,
    },
  ];

  const employeeIds: Record<string, number> = {};
  for (const spec of employeeSpecs) {
    const existing = (
      await db
        .select({ id: erpEmployees.id })
        .from(erpEmployees)
        .where(and(eq(erpEmployees.schoolId, schoolId), eq(erpEmployees.employeeCode, spec.code)))
        .limit(1)
    )[0];
    if (existing) {
      employeeIds[spec.code] = existing.id;
      continue;
    }
    const inserted = await db
      .insert(erpEmployees)
      .values({
        schoolId,
        userId: spec.userId,
        employeeCode: spec.code,
        firstName: spec.first,
        lastName: spec.last,
        workEmail: `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}@erp-demo.pk`,
        phone: "+92 300 0000000",
        departmentId: departmentIds[spec.dept]!,
        positionId: positionIds[spec.pos]!,
        employmentType: "full_time",
        joinedAt: isoDaysFromNow(-365),
        isActive: true,
      })
      .returning({ id: erpEmployees.id });
    employeeIds[spec.code] = inserted[0]!.id;
  }
  console.log(
    `✅ HRM: ${employeeSpecs.length} employees across ${departmentNames.length} departments`
  );

  // Staff attendance for the last 5 working days
  for (let d = 1; d <= 5; d++) {
    const workDate = isoDaysFromNow(-d);
    for (const spec of employeeSpecs) {
      await db
        .insert(erpAttendanceRecords)
        .values({
          schoolId,
          employeeId: employeeIds[spec.code]!,
          workDate,
          status: d === 3 && spec.code === "EMP-0005" ? "late" : "present",
          source: "manual",
        })
        .onConflictDoNothing();
    }
  }

  // Time off
  const policyExisting = (
    await db
      .select({ id: erpTimeOffPolicies.id })
      .from(erpTimeOffPolicies)
      .where(
        and(eq(erpTimeOffPolicies.schoolId, schoolId), eq(erpTimeOffPolicies.name, "Annual Leave"))
      )
      .limit(1)
  )[0];
  let annualLeavePolicyId = policyExisting?.id ?? null;
  if (!annualLeavePolicyId) {
    const inserted = await db
      .insert(erpTimeOffPolicies)
      .values({
        schoolId,
        name: "Annual Leave",
        description: "Paid annual leave",
        paid: true,
        requiresApproval: true,
        annualDays: 20,
      })
      .returning({ id: erpTimeOffPolicies.id });
    annualLeavePolicyId = inserted[0]!.id;
    await db.insert(erpTimeOffRequests).values([
      {
        schoolId,
        employeeId: employeeIds["EMP-0004"]!,
        policyId: annualLeavePolicyId,
        startDate: isoDaysFromNow(10),
        endDate: isoDaysFromNow(14),
        status: "requested",
        reason: "Family wedding",
      },
      {
        schoolId,
        employeeId: employeeIds["EMP-0006"]!,
        policyId: annualLeavePolicyId,
        startDate: isoDaysFromNow(-20),
        endDate: isoDaysFromNow(-18),
        status: "approved",
        reason: "Medical",
      },
    ]);
  }

  await db
    .insert(erpOfficialHolidays)
    .values([
      {
        schoolId,
        name: "Independence Day",
        startDate: isoDaysFromNow(45),
        endDate: isoDaysFromNow(45),
      },
      { schoolId, name: "Iqbal Day", startDate: isoDaysFromNow(75), endDate: isoDaysFromNow(75) },
    ])
    .onConflictDoNothing();

  // Salary structures
  for (const spec of employeeSpecs) {
    const existing = await db
      .select({ id: erpSalaryStructures.id })
      .from(erpSalaryStructures)
      .where(
        and(
          eq(erpSalaryStructures.schoolId, schoolId),
          eq(erpSalaryStructures.employeeId, employeeIds[spec.code]!)
        )
      )
      .limit(1);
    if (existing[0]) continue;
    const basic =
      spec.pos === "Senior Teacher" ? "120000" : spec.pos === "Teacher" ? "90000" : "60000";
    await db.insert(erpSalaryStructures).values({
      schoolId,
      employeeId: employeeIds[spec.code]!,
      currency: "PKR",
      basicSalary: basic,
      components: { house_rent: 12000, transport: 5000, "deduction:provident": 2000 },
      effectiveFrom: isoDaysFromNow(-300),
      isActive: true,
    });
  }

  // Expenses
  const expenseCategoryNames = ["Utilities", "Maintenance", "Supplies"];
  const expenseCategoryIds: Record<string, number> = {};
  for (const name of expenseCategoryNames) {
    const existing = (
      await db
        .select({ id: erpExpenseCategories.id })
        .from(erpExpenseCategories)
        .where(
          and(eq(erpExpenseCategories.schoolId, schoolId), eq(erpExpenseCategories.name, name))
        )
        .limit(1)
    )[0];
    if (existing) {
      expenseCategoryIds[name] = existing.id;
      continue;
    }
    const inserted = await db
      .insert(erpExpenseCategories)
      .values({ schoolId, name })
      .returning({ id: erpExpenseCategories.id });
    expenseCategoryIds[name] = inserted[0]!.id;
  }
  await db
    .insert(erpExpenses)
    .values([
      {
        schoolId,
        categoryId: expenseCategoryIds["Utilities"]!,
        employeeId: null,
        title: "Electricity bill — September",
        amount: "45000",
        spentAt: isoDaysFromNow(-10),
        status: "approved",
      },
      {
        schoolId,
        categoryId: expenseCategoryIds["Maintenance"]!,
        employeeId: null,
        title: "Lab equipment repair",
        amount: "18000",
        spentAt: isoDaysFromNow(-5),
        status: "submitted",
      },
      {
        schoolId,
        categoryId: expenseCategoryIds["Supplies"]!,
        employeeId: employeeIds["EMP-0003"]!,
        title: "Whiteboards and markers",
        amount: "9500",
        spentAt: isoDaysFromNow(-2),
        status: "submitted",
      },
    ])
    .onConflictDoNothing();
  console.log("✅ HRM: attendance, time off, salaries, expenses");

  // ── 5. CRM: admissions pipeline ────────────────────────────────────
  let pipeline = (
    await db
      .select()
      .from(erpPipelines)
      .where(and(eq(erpPipelines.schoolId, schoolId), eq(erpPipelines.name, "Admissions 2026")))
      .limit(1)
  )[0];
  if (!pipeline) {
    const insertedPipeline = await db
      .insert(erpPipelines)
      .values({
        schoolId,
        name: "Admissions 2026",
        description: "Main admissions funnel",
        isActive: true,
      })
      .returning();
    pipeline = insertedPipeline[0]!;

    const stageNames = ["Inquiry", "Applied", "Entrance Test", "Interview", "Enrolled"];
    const stageIds: number[] = [];
    for (let i = 0; i < stageNames.length; i++) {
      const insertedStage = await db
        .insert(erpPipelineStages)
        .values({ schoolId, pipelineId: pipeline.id, name: stageNames[i]!, position: i })
        .returning({ id: erpPipelineStages.id });
      stageIds.push(insertedStage[0]!.id);
    }

    const contactSpecs = [
      {
        name: "Rashid Parent",
        type: "lead",
        studentName: "Ahmed Rashid",
        grade: "9",
        source: "walk_in",
      },
      {
        name: "Nadia Parent",
        type: "lead",
        studentName: "Zara Nadia",
        grade: "9",
        source: "referral",
      },
      {
        name: "Kamran Parent",
        type: "lead",
        studentName: "Ali Kamran",
        grade: "10",
        source: "website",
      },
      {
        name: "Shazia Parent",
        type: "lead",
        studentName: "Hira Shazia",
        grade: "10",
        source: "campaign",
      },
      { name: "Book Haven Ltd", type: "vendor", studentName: null, grade: null, source: "other" },
    ];
    const contactIds: number[] = [];
    for (const spec of contactSpecs) {
      const insertedContact = await db
        .insert(erpContacts)
        .values({
          schoolId,
          contactType: spec.type,
          name: spec.name,
          email: `${spec.name.split(" ")[0]!.toLowerCase()}@example.pk`,
          phone: "+92 321 0000000",
          studentName: spec.studentName,
          studentGrade: spec.grade,
          source: spec.source,
          budget: "60000",
        })
        .returning({ id: erpContacts.id });
      contactIds.push(insertedContact[0]!.id);
    }

    await db.insert(erpDeals).values([
      {
        schoolId,
        pipelineId: pipeline.id,
        stageId: stageIds[0]!,
        contactId: contactIds[0]!,
        title: "Ahmed — Grade 9 admission",
        value: "45000",
        probability: 20,
        expectedCloseDate: isoDaysFromNow(30),
      },
      {
        schoolId,
        pipelineId: pipeline.id,
        stageId: stageIds[1]!,
        contactId: contactIds[1]!,
        title: "Zara — Grade 9 admission",
        value: "45000",
        probability: 40,
        expectedCloseDate: isoDaysFromNow(25),
      },
      {
        schoolId,
        pipelineId: pipeline.id,
        stageId: stageIds[2]!,
        contactId: contactIds[2]!,
        title: "Ali — Grade 10 admission",
        value: "50000",
        probability: 60,
        expectedCloseDate: isoDaysFromNow(15),
      },
      {
        schoolId,
        pipelineId: pipeline.id,
        stageId: stageIds[3]!,
        contactId: contactIds[3]!,
        title: "Hira — Grade 10 admission",
        value: "50000",
        probability: 80,
        expectedCloseDate: isoDaysFromNow(7),
      },
    ]);
    console.log("✅ CRM: admissions pipeline with 5 stages, 5 contacts, 4 deals");
  }

  // ── 6. Academics ────────────────────────────────────────────────────
  let year = (
    await db
      .select()
      .from(erpAcademicYears)
      .where(and(eq(erpAcademicYears.schoolId, schoolId), eq(erpAcademicYears.name, "2026-27")))
      .limit(1)
  )[0];
  if (!year) {
    const insertedYear = await db
      .insert(erpAcademicYears)
      .values({
        schoolId,
        name: "2026-27",
        startDate: isoDaysFromNow(-30),
        endDate: isoDaysFromNow(330),
        isCurrent: true,
      })
      .returning();
    year = insertedYear[0]!;

    const insertedTerm = await db
      .insert(erpTerms)
      .values({
        schoolId,
        academicYearId: year.id,
        name: "Term 1",
        startDate: isoDaysFromNow(-30),
        endDate: isoDaysFromNow(90),
        isCurrent: true,
      })
      .returning({ id: erpTerms.id });
    const termId = insertedTerm[0]!.id;

    const insertedClasses = await db
      .insert(erpSchoolClasses)
      .values([
        {
          schoolId,
          academicYearId: year.id,
          name: "9-A",
          gradeLevel: "9",
          section: "A",
          capacity: 40,
          classTeacherId: employeeIds["EMP-0004"]!,
          room: "101",
        },
        {
          schoolId,
          academicYearId: year.id,
          name: "9-B",
          gradeLevel: "9",
          section: "B",
          capacity: 40,
          classTeacherId: employeeIds["EMP-0006"]!,
          room: "102",
        },
        {
          schoolId,
          academicYearId: year.id,
          name: "10-A",
          gradeLevel: "10",
          section: "A",
          capacity: 40,
          classTeacherId: employeeIds["EMP-0005"]!,
          room: "201",
        },
      ])
      .returning();
    const class9A = insertedClasses[0]!;

    // Demo students
    const studentNames = [
      "Ahmed Ali",
      "Sara Khan",
      "Usman Tariq",
      "Mahnoor Fatima",
      "Bilal Hussain",
      "Areeba Noor",
    ];
    const studentIds: string[] = [];
    for (let i = 0; i < studentNames.length; i++) {
      const studentUserId = uid();
      await db.insert(users).values({
        id: studentUserId,
        name: studentNames[i]!,
        email: `student-erp-${i}-${ts}@demo.pk`,
        emailVerified: true,
        class: "9",
        board: "fbise",
        role: "student",
        status: "active",
        xp: Math.floor(Math.random() * 500),
        level: Math.floor(Math.random() * 5),
        schoolId,
      });
      studentIds.push(studentUserId);
      await db
        .insert(erpEnrollments)
        .values({
          schoolId,
          classId: class9A.id,
          studentUserId,
          rollNumber: String(i + 1),
          status: "active",
          enrolledAt: isoDaysFromNow(-25),
        })
        .onConflictDoNothing();
    }

    const insertedSubjects = await db
      .insert(erpClassSubjects)
      .values([
        {
          schoolId,
          classId: class9A.id,
          name: "Mathematics",
          subjectCode: "MTH-9",
          teacherId: employeeIds["EMP-0004"]!,
        },
        {
          schoolId,
          classId: class9A.id,
          name: "Physics",
          subjectCode: "PHY-9",
          teacherId: employeeIds["EMP-0005"]!,
        },
        {
          schoolId,
          classId: class9A.id,
          name: "Chemistry",
          subjectCode: "CHM-9",
          teacherId: employeeIds["EMP-0005"]!,
        },
        {
          schoolId,
          classId: class9A.id,
          name: "English",
          subjectCode: "ENG-9",
          teacherId: employeeIds["EMP-0006"]!,
        },
      ])
      .returning();

    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const periodTimes = [
      ["08:00", "08:45"],
      ["08:50", "09:35"],
      ["09:40", "10:25"],
      ["10:45", "11:30"],
      ["11:35", "12:20"],
      ["12:25", "13:10"],
    ];
    for (let d = 0; d < weekdays.length; d++) {
      for (let p = 0; p < periodTimes.length; p++) {
        const subject = insertedSubjects[(d + p) % insertedSubjects.length]!;
        await db
          .insert(erpTimetableSlots)
          .values({
            schoolId,
            classId: class9A.id,
            classSubjectId: subject.id,
            weekday: weekdays[d]!,
            periodNumber: p + 1,
            startTime: periodTimes[p]![0]!,
            endTime: periodTimes[p]![1]!,
            room: class9A.room,
          })
          .onConflictDoNothing();
      }
    }

    // Exam + grades
    const insertedExam = await db
      .insert(erpExams)
      .values({
        schoolId,
        termId,
        classSubjectId: insertedSubjects[0]!.id,
        name: "Mathematics Mid-Term",
        examDate: isoDaysFromNow(-7),
        totalMarks: 100,
        weight: "1",
      })
      .returning();
    const exam = insertedExam[0]!;
    for (let i = 0; i < studentIds.length; i++) {
      await db
        .insert(erpGrades)
        .values({
          schoolId,
          examId: exam.id,
          studentUserId: studentIds[i]!,
          marksObtained: String(55 + ((i * 13) % 40)),
          gradedBy: staffUserIds["erp_admin"]!,
          gradedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    // Student attendance for last 5 days
    for (let d = 1; d <= 5; d++) {
      for (let i = 0; i < studentIds.length; i++) {
        await db
          .insert(erpStudentAttendance)
          .values({
            schoolId,
            classId: class9A.id,
            studentUserId: studentIds[i]!,
            attendanceDate: isoDaysFromNow(-d),
            status: i === 2 && d === 2 ? "absent" : i === 4 && d === 3 ? "late" : "present",
            recordedBy: staffUserIds["erp_admin"]!,
          })
          .onConflictDoNothing();
      }
    }
    console.log(
      `✅ Academics: year/terms, 3 classes, ${studentIds.length} students, 4 subjects, timetable, exam+grades, attendance`
    );

    // ── 7. Finance: fee structure + invoices ─────────────────────────
    const insertedFee = await db
      .insert(erpFeeStructures)
      .values({
        schoolId,
        name: "Grade 9 — Monthly Fee",
        classLevel: "9",
        currency: "PKR",
        totalAmount: "16000",
        isActive: true,
      })
      .returning();
    const feeStructure = insertedFee[0]!;
    await db.insert(erpFeeComponents).values([
      { schoolId, feeStructureId: feeStructure.id, name: "Tuition", amount: "12000", position: 0 },
      {
        schoolId,
        feeStructureId: feeStructure.id,
        name: "Lab charges",
        amount: "1500",
        position: 1,
      },
      { schoolId, feeStructureId: feeStructure.id, name: "Library", amount: "1000", position: 2 },
      { schoolId, feeStructureId: feeStructure.id, name: "Exam fee", amount: "1500", position: 3 },
    ]);

    for (let i = 0; i < Math.min(4, studentIds.length); i++) {
      const studentUserId = studentIds[i]!;
      const invoiceNumber = `INV-2026-${String(i + 1).padStart(4, "0")}`;
      const existingInvoice = await db
        .select({ id: erpInvoices.id })
        .from(erpInvoices)
        .where(
          and(eq(erpInvoices.schoolId, schoolId), eq(erpInvoices.invoiceNumber, invoiceNumber))
        )
        .limit(1);
      if (existingInvoice[0]) continue;

      const insertedInvoice = await db
        .insert(erpInvoices)
        .values({
          schoolId,
          invoiceNumber,
          studentUserId,
          feeStructureId: feeStructure.id,
          status: i === 0 ? "paid" : i === 1 ? "partially_paid" : i === 2 ? "sent" : "draft",
          issueDate: isoDaysFromNow(-20),
          dueDate: isoDaysFromNow(-5),
          currency: "PKR",
          subtotal: "16000",
          discount: "1000",
          tax: "0",
          total: "15000",
          amountPaid: i === 0 ? "15000" : i === 1 ? "7000" : "0",
          createdBy: staffUserIds["erp_finance"]!,
        })
        .returning();
      const invoice = insertedInvoice[0]!;
      await db.insert(erpInvoiceItems).values([
        {
          schoolId,
          invoiceId: invoice.id,
          description: "Tuition — September",
          quantity: "1",
          unitPrice: "12000",
          total: "12000",
          position: 0,
        },
        {
          schoolId,
          invoiceId: invoice.id,
          description: "Lab + Library + Exam",
          quantity: "1",
          unitPrice: "4000",
          total: "4000",
          position: 1,
        },
      ]);
      if (i === 0 || i === 1) {
        await db.insert(erpPayments).values({
          schoolId,
          invoiceId: invoice.id,
          amount: i === 0 ? "15000" : "7000",
          currency: "PKR",
          method: i === 0 ? "bank_transfer" : "cash",
          reference: `TXN-${ts}-${i}`,
          recordedBy: staffUserIds["erp_finance"]!,
        });
      }
    }
    console.log("✅ Finance: fee structure + 4 invoices with payments");
  }

  // ── 8. Approvals ───────────────────────────────────────────────────
  const policyTypes = ["time_off", "expense"] as const;
  for (const requestType of policyTypes) {
    const existing = (
      await db
        .select({ id: erpApprovalPolicies.id })
        .from(erpApprovalPolicies)
        .where(
          and(
            eq(erpApprovalPolicies.schoolId, schoolId),
            eq(erpApprovalPolicies.requestType, requestType)
          )
        )
        .limit(1)
    )[0];
    if (existing) continue;
    await db.insert(erpApprovalPolicies).values({
      schoolId,
      name: requestType === "time_off" ? "Leave approval" : "Expense approval",
      requestType,
      description: `Default ${requestType.replace("_", " ")} approval policy`,
      minApprovals: 1,
      isActive: true,
    });
  }

  const existingTimeOffApproval = (
    await db
      .select({ id: erpRequestApprovals.id })
      .from(erpRequestApprovals)
      .where(
        and(
          eq(erpRequestApprovals.schoolId, schoolId),
          eq(erpRequestApprovals.requestType, "time_off")
        )
      )
      .limit(1)
  )[0];
  if (!existingTimeOffApproval) {
    const pendingRequest = (
      await db
        .select({ id: erpTimeOffRequests.id })
        .from(erpTimeOffRequests)
        .where(
          and(eq(erpTimeOffRequests.schoolId, schoolId), eq(erpTimeOffRequests.status, "requested"))
        )
        .limit(1)
    )[0];
    if (pendingRequest) {
      await db.insert(erpRequestApprovals).values({
        schoolId,
        requestType: "time_off",
        requestId: pendingRequest.id,
        title: "Leave request — Fatima Noor",
        description: "Family wedding (3 days)",
        status: "requested",
        minApprovals: 1,
        requestedByEmployeeId: employeeIds["EMP-0004"]!,
      });
    }
  }
  console.log("✅ Approvals: policies + pending request");

  console.log("\n🎉 ERP demo seed complete!");
  console.log(`   Principal email: ${school.adminUserId ? "(see schools table)" : ""}`);
  console.log("   ERP is mounted at /school/erp in the frontend");
  process.exit(0);
}

main().catch((error) => {
  console.error("ERP demo seed failed:", error);
  process.exit(1);
});
