import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";

import { and, eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { schools, users } from "../../lib/db/schema.js";
import { erpRolePermissions, erpRoles, erpUserRoles } from "../../lib/db/schema/erp/core.js";
import { erpEmployees } from "../../lib/db/schema/erp/hrm.js";
import {
  erpContacts,
  erpDeals,
  erpPipelines,
  erpPipelineStages,
} from "../../lib/db/schema/erp/crm.js";
import {
  erpAcademicYears,
  erpClassSubjects,
  erpEnrollments,
  erpSchoolClasses,
} from "../../lib/db/schema/erp/academics.js";
import { erpApprovalPolicies, erpRequestApprovals } from "../../lib/db/schema/erp/approvals.js";
import {
  erpFeeComponents,
  erpFeeStructures,
  erpInvoices,
  erpPayments,
} from "../../lib/db/schema/erp/finance.js";
import { invalidateSchoolPermissions } from "../../lib/erp/permissions.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

type AuthAgent = ReturnType<typeof request.agent>;

const signUp = async (agent: AuthAgent, name: string, email: string): Promise<string> => {
  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name,
    email,
    password: TEST_PASSWORD,
    class: "9th",
    board: "fbise",
  });
  assert.ok(response.status < 400, `Expected sign-up success for ${email}, got ${response.status}`);
  const id = response.body?.user?.id as string | undefined;
  assert.ok(id, "Expected user id from sign-up");
  return id;
};

const uniqueSuffix = () => `${Date.now()}-${randomBytes(4).toString("hex")}`;

// ── Shared fixture state (populated by the setup test) ──────────────
const suffix = uniqueSuffix();
const app = createApp();
const schoolAdminAgent = request.agent(app);
const staffAgent = request.agent(app);
const outsiderAgent = request.agent(app);
const studentAgent = request.agent(app);

let adminUserId = "";
let staffUserId = "";
let outsiderUserId = "";
let studentUserId = "";
let schoolId = 0;

test("ERP fixtures: users, school, system roles, staff assignment", async () => {
  adminUserId = await signUp(
    schoolAdminAgent,
    `ERP Admin ${suffix}`,
    `erp-admin-${suffix}@test.pk`
  );
  staffUserId = await signUp(staffAgent, `ERP Staff ${suffix}`, `erp-staff-${suffix}@test.pk`);
  outsiderUserId = await signUp(
    outsiderAgent,
    `ERP Outsider ${suffix}`,
    `erp-outsider-${suffix}@test.pk`
  );
  studentUserId = await signUp(
    studentAgent,
    `ERP Student ${suffix}`,
    `erp-student-${suffix}@test.pk`
  );
  await db.update(users).set({ role: "student" }).where(eq(users.id, studentUserId));

  const schoolRows = await db
    .insert(schools)
    .values({
      name: `ERP Test School ${suffix}`,
      slug: `erp-test-${suffix}`,
      board: "fbise",
      inviteCode: `LPK-${suffix}`.slice(0, 50),
      adminUserId,
    })
    .returning();
  schoolId = schoolRows[0]!.id;

  const adminRolesRes = await schoolAdminAgent
    .post("/api/erp/roles/seed")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(adminRolesRes.status, 200, "Owner can seed system roles");

  // Assign erp_staff role to staff user (as owner via API)
  const staffRoleRows = await db
    .select({ id: erpRoles.id })
    .from(erpRoles)
    .where(and(eq(erpRoles.schoolId, schoolId), eq(erpRoles.key, "erp_staff")))
    .limit(1);
  const staffRoleId = staffRoleRows[0]!.id;

  const assignRes = await schoolAdminAgent
    .post("/api/erp/roles/assign")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ userId: staffUserId, roleIds: [staffRoleId] });
  assert.equal(assignRes.status, 200, "Role assignment succeeds");
  invalidateSchoolPermissions(schoolId, staffUserId);
});

test("GET /api/erp/schools lists schools with permissions per user", async () => {
  const adminRes = await schoolAdminAgent.get("/api/erp/schools").set("origin", APP_ORIGIN);
  assert.equal(adminRes.status, 200);
  const adminSchool = adminRes.body.data.schools.find((s: { id: number }) => s.id === schoolId);
  assert.ok(adminSchool, "Owner sees the school");
  assert.ok(adminSchool.isAdmin, "Owner is flagged as admin (owner)");

  const staffRes = await staffAgent.get("/api/erp/schools").set("origin", APP_ORIGIN);
  assert.equal(staffRes.status, 200);
  const staffSchool = staffRes.body.data.schools.find((s: { id: number }) => s.id === schoolId);
  assert.ok(staffSchool, "Staff sees the school");
  assert.ok(staffSchool.permissions.includes("CONTACTS_VIEW"), "Staff role grants CONTACTS_VIEW");
  assert.ok(
    !staffSchool.permissions.includes("EMPLOYEES_MANAGE"),
    "Staff role does not grant EMPLOYEES_MANAGE"
  );

  const outsiderRes = await outsiderAgent.get("/api/erp/schools").set("origin", APP_ORIGIN);
  assert.equal(outsiderRes.status, 200);
  const outsiderSchool = outsiderRes.body.data.schools.find(
    (s: { id: number }) => s.id === schoolId
  );
  assert.equal(outsiderSchool, undefined, "Outsider has no ERP access to the school");
});

test("erpGuard enforces permission + school isolation", async () => {
  // Owner can list roles
  const ownerRes = await schoolAdminAgent
    .get("/api/erp/roles")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(ownerRes.status, 200);
  assert.ok(
    Array.isArray(ownerRes.body.data.roles) && ownerRes.body.data.roles.length >= 5,
    "System roles seeded"
  );

  // Staff lacks ROLES_VIEW (erp_staff role has no ROLES_VIEW)
  const staffRes = await staffAgent
    .get("/api/erp/roles")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(staffRes.status, 403, "Staff is denied ROLES_VIEW");

  // Outsider: no role at all → 403
  const outsiderRes = await outsiderAgent
    .get("/api/erp/hrm/employees")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(outsiderRes.status, 403, "Outsider denied without any role");

  // Missing schoolId → 400
  const noSchoolRes = await schoolAdminAgent.get("/api/erp/roles").set("origin", APP_ORIGIN);
  assert.equal(noSchoolRes.status, 400, "Missing schoolId rejected");
});

test("HRM: departments + employees CRUD (owner)", async () => {
  const deptRes = await schoolAdminAgent
    .post("/api/erp/hrm/departments")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ name: `Math Dept ${suffix}`, description: "Mathematics" });
  assert.equal(deptRes.status, 201, `Department create: ${JSON.stringify(deptRes.body)}`);
  const departmentId = deptRes.body.data.department.id as number;

  const empRes = await schoolAdminAgent
    .post("/api/erp/hrm/employees")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      firstName: "Ayesha",
      lastName: "Teacher",
      workEmail: `ayesha-${suffix}@test.pk`,
      departmentId,
      employmentType: "full_time",
    });
  assert.equal(empRes.status, 201, `Employee create: ${JSON.stringify(empRes.body)}`);
  const employeeId = empRes.body.data.employee.id as number;
  assert.ok(employeeId > 0);

  const listRes = await schoolAdminAgent
    .get("/api/erp/hrm/employees")
    .query({ schoolId, search: "Ayesha" })
    .set("origin", APP_ORIGIN);
  assert.equal(listRes.status, 200);
  assert.ok(
    listRes.body.data.items.some((e: { id: number }) => e.id === employeeId),
    "Search finds the employee"
  );

  // Staff can view (EMPLOYEES_VIEW is in erp_staff)
  const staffViewRes = await staffAgent
    .get("/api/erp/hrm/employees")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(staffViewRes.status, 200, "Staff with EMPLOYEES_VIEW can list");

  // Staff cannot create employees (no EMPLOYEES_MANAGE)
  const staffCreateRes = await staffAgent
    .post("/api/erp/hrm/employees")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ firstName: "No", lastName: "Access" });
  assert.equal(staffCreateRes.status, 403, "Staff denied EMPLOYEES_MANAGE");
});

test("CRM: pipeline + contacts + deals + school isolation", async () => {
  const pipelineRes = await schoolAdminAgent
    .post("/api/erp/crm/pipelines")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ name: `Admissions ${suffix}`, stages: ["Inquiry", "Applied", "Enrolled"] });
  assert.equal(pipelineRes.status, 201, `Pipeline create: ${JSON.stringify(pipelineRes.body)}`);
  const pipelineId = pipelineRes.body.data.pipeline.id as number;

  const contactRes = await schoolAdminAgent
    .post("/api/erp/crm/contacts")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      name: `Parent ${suffix}`,
      contactType: "lead",
      email: `parent-${suffix}@test.pk`,
      studentName: "Child One",
    });
  assert.equal(contactRes.status, 201, `Contact create: ${JSON.stringify(contactRes.body)}`);
  const contactId = contactRes.body.data.contact.id as number;

  const stageRows = await db
    .select()
    .from(erpPipelineStages)
    .where(eq(erpPipelineStages.pipelineId, pipelineId));
  assert.equal(stageRows.length, 3, "Stages created in order");
  const firstStage = stageRows.find((s) => s.position === 0)!;

  const dealRes = await schoolAdminAgent
    .post("/api/erp/crm/deals")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      title: `Admission deal ${suffix}`,
      pipelineId,
      stageId: firstStage.id,
      contactId,
      value: "45000",
    });
  assert.equal(dealRes.status, 201, `Deal create: ${JSON.stringify(dealRes.body)}`);

  // Outsider cannot even see contacts
  const outsiderRes = await outsiderAgent
    .get("/api/erp/crm/contacts")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(outsiderRes.status, 403, "School isolation enforced for CRM");
});

test("Finance: fee structure → invoice → payment lifecycle", async () => {
  const feeRes = await schoolAdminAgent
    .post("/api/erp/finance/fee-structures")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      name: `Grade 9 Fee ${suffix}`,
      classLevel: "9",
      components: [
        { name: "Tuition", amount: 10000 },
        { name: "Lab", amount: 2000 },
      ],
    });
  assert.equal(feeRes.status, 201, `Fee create: ${JSON.stringify(feeRes.body)}`);
  const feeStructureId = feeRes.body.data.feeStructure.id as number;
  assert.equal(feeRes.body.data.feeStructure.totalAmount, "12000.00", "Total computed");
  assert.ok(feeStructureId > 0);

  const invoiceRes = await schoolAdminAgent
    .post("/api/erp/finance/invoices")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      studentUserId,
      items: [{ description: "Tuition — October", quantity: 1, unitPrice: 10000 }],
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    });
  assert.equal(invoiceRes.status, 201, `Invoice create: ${JSON.stringify(invoiceRes.body)}`);
  const invoiceId = invoiceRes.body.data.invoice.id as number;
  assert.equal(invoiceRes.body.data.invoice.total, "10000.00", "Invoice total computed");

  const payRes = await schoolAdminAgent
    .post(`/api/erp/finance/invoices/${invoiceId}/payments`)
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ amount: 4000, method: "cash" });
  assert.equal(payRes.status, 201, `Payment: ${JSON.stringify(payRes.body)}`);
  assert.equal(
    payRes.body.data.invoice.status,
    "partially_paid",
    "Partial payment sets partially_paid"
  );

  const pay2Res = await schoolAdminAgent
    .post(`/api/erp/finance/invoices/${invoiceId}/payments`)
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ amount: 6000, method: "cash" });
  assert.equal(pay2Res.status, 201);
  assert.equal(pay2Res.body.data.invoice.status, "paid", "Full payment sets paid");

  // Student self-service: sees only own invoice
  const myRes = await studentAgent
    .get("/api/erp/finance/my/invoices")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.ok(myRes.status === 200 || myRes.status === 403, `My invoices handled (${myRes.status})`);
  if (myRes.status === 200) {
    const myInvoices = myRes.body.data.invoices ?? myRes.body.data.items ?? [];
    assert.ok(
      myInvoices.every((i: { studentUserId: string }) => i.studentUserId === studentUserId),
      "Student sees only own invoices"
    );
  }
});

test("Academics: year → class → enrollment → timetable", async () => {
  const yearRes = await schoolAdminAgent
    .post("/api/erp/academics/years")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      name: `AY ${suffix}`,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
      isCurrent: true,
    });
  assert.equal(yearRes.status, 201, `Year create: ${JSON.stringify(yearRes.body)}`);
  const yearId = yearRes.body.data.year.id as number;

  const classRes = await schoolAdminAgent
    .post("/api/erp/academics/classes")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      academicYearId: yearId,
      name: `9-X-${suffix.slice(-4)}`,
      gradeLevel: "9",
      section: "X",
      capacity: 30,
    });
  assert.equal(classRes.status, 201, `Class create: ${JSON.stringify(classRes.body)}`);
  const classId = classRes.body.data.class.id as number;

  const enrollRes = await schoolAdminAgent
    .post(`/api/erp/academics/classes/${classId}/enroll`)
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ studentUserId, rollNumber: "1" });
  assert.equal(enrollRes.status, 201, `Enroll: ${JSON.stringify(enrollRes.body)}`);

  // Duplicate enrollment rejected
  const dupRes = await schoolAdminAgent
    .post(`/api/erp/academics/classes/${classId}/enroll`)
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ studentUserId });
  assert.equal(dupRes.status, 409, "Duplicate enrollment rejected");

  const subjectRes = await schoolAdminAgent
    .post(`/api/erp/academics/classes/${classId}/subjects`)
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ name: `Math ${suffix}`, subjectCode: "MTH" });
  assert.equal(subjectRes.status, 201, `Subject create: ${JSON.stringify(subjectRes.body)}`);
  const subjectId = subjectRes.body.data.subject.id as number;

  const slotRes = await schoolAdminAgent
    .post("/api/erp/academics/timetable")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      classId,
      classSubjectId: subjectId,
      weekday: "monday",
      periodNumber: 1,
      startTime: "08:00",
      endTime: "08:45",
    });
  assert.equal(slotRes.status, 200, `Timetable upsert: ${JSON.stringify(slotRes.body)}`);

  // Student self-service schedule
  const myScheduleRes = await studentAgent
    .get("/api/erp/academics/my/schedule")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.ok(
    myScheduleRes.status === 200 || myScheduleRes.status === 404 || myScheduleRes.status === 403,
    `My schedule handled (${myScheduleRes.status})`
  );
});

test("Approvals: policy + request + quorum voting", async () => {
  const policyRes = await schoolAdminAgent
    .post("/api/erp/approvals/policies")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      name: `Expense policy ${suffix}`,
      requestType: "custom",
      minApprovals: 1,
    });
  assert.equal(policyRes.status, 201, `Policy create: ${JSON.stringify(policyRes.body)}`);

  const requestRes = await schoolAdminAgent
    .post("/api/erp/approvals/requests")
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({
      requestType: "custom",
      requestId: 12345,
      title: `Purchase request ${suffix}`,
      description: "New lab equipment",
    });
  assert.equal(requestRes.status, 201, `Request create: ${JSON.stringify(requestRes.body)}`);
  const requestApprovalId = requestRes.body.data.request.id as number;

  const voteRes = await schoolAdminAgent
    .post(`/api/erp/approvals/requests/${requestApprovalId}/vote`)
    .query({ schoolId })
    .set("origin", APP_ORIGIN)
    .send({ vote: "approve", comment: "Approved by owner" });
  assert.equal(voteRes.status, 200, `Vote: ${JSON.stringify(voteRes.body)}`);
  assert.equal(voteRes.body.data.request.status, "approved", "Quorum reached → request approved");
});

test("Dashboard aggregates render for owner", async () => {
  const res = await schoolAdminAgent
    .get("/api/erp/dashboard")
    .query({ schoolId })
    .set("origin", APP_ORIGIN);
  assert.equal(res.status, 200, `Dashboard: ${JSON.stringify(res.body)}`);
  assert.equal(typeof res.body.data.students.activeCount, "number");
  assert.equal(typeof res.body.data.finance.outstanding, "number");
});

test("Cross-school isolation: staff of school A has no access to school B data", async () => {
  // Create a second school owned by the outsider
  const schoolBRows = await db
    .insert(schools)
    .values({
      name: `ERP School B ${suffix}`,
      slug: `erp-b-${suffix}`,
      board: "fbise",
      inviteCode: `LPK-B-${suffix}`.slice(0, 50),
      adminUserId: outsiderUserId,
    })
    .returning();
  const schoolB = schoolBRows[0]!;

  const res = await staffAgent
    .get("/api/erp/hrm/employees")
    .query({ schoolId: schoolB.id })
    .set("origin", APP_ORIGIN);
  assert.equal(res.status, 403, "Staff of school A denied in school B");

  // Cleanup school B
  await db.delete(schools).where(eq(schools.id, schoolB.id));
});

after(async () => {
  try {
    await db.delete(schools).where(eq(schools.id, schoolId));
    await db.delete(users).where(eq(users.email, `erp-admin-${suffix}@test.pk`));
    await db.delete(users).where(eq(users.email, `erp-staff-${suffix}@test.pk`));
    await db.delete(users).where(eq(users.email, `erp-outsider-${suffix}@test.pk`));
    await db.delete(users).where(eq(users.email, `erp-student-${suffix}@test.pk`));
    invalidateSchoolPermissions();
  } catch {
    // Best-effort cleanup; fixtures may not have been created.
  }
  try {
    await pool.end();
  } catch {
    // Pool may already be closed.
  }
});
