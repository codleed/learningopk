import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export class ErpApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ErpApiError";
    this.status = status;
    this.code = code;
  }
}

let activeSchoolId: number | null = null;

export function setActiveErpSchool(schoolId: number | null) {
  activeSchoolId = schoolId;
}

export function getActiveErpSchool(): number | null {
  return activeSchoolId;
}

async function fetchErpJson<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit & { schoolId?: number }
): Promise<T> {
  const { schoolId, ...fetchOptions } = options ?? {};
  const id = schoolId ?? activeSchoolId;
  const url = new URL(`${backendUrl}${path}`, "http://placeholder.local");
  if (id !== null && id !== undefined) {
    url.searchParams.set("schoolId", String(id));
  }

  const headers: Record<string, string> = {};
  if (fetchOptions.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${backendUrl}${url.pathname}${url.search}`, {
    cache: "no-store",
    credentials: "include",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...fetchOptions,
  });

  if (!response.ok) {
    let code = "UNKNOWN";
    let message = `ERP API error: ${response.status}`;
    try {
      const body = (await response.json()) as { code?: string; error?: string };
      code = body.code ?? code;
      message = body.error ?? message;
    } catch {
      // keep defaults
    }
    throw new ErpApiError(response.status, code, message);
  }

  const json = await response.json();
  return schema.parse(json.data ?? json);
}

// --- Schemas ---

const paginationMeta = {
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
};

export const erpSchoolSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  board: z.string(),
  adminUserId: z.string().nullable(),
  isOwner: z.boolean(),
  isAdmin: z.boolean(),
  permissions: z.array(z.string()),
});
export type ErpSchool = z.infer<typeof erpSchoolSchema>;

export const erpRoleSchema = z.object({
  id: z.number(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
});
export type ErpRole = z.infer<typeof erpRoleSchema>;

export const erpTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(),
});
export type ErpTag = z.infer<typeof erpTagSchema>;

export const erpEmployeeSchema = z.object({
  id: z.number(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  workEmail: z.string().nullable(),
  phone: z.string().nullable(),
  departmentId: z.number().nullable(),
  departmentName: z.string().nullable().optional(),
  positionId: z.number().nullable(),
  positionName: z.string().nullable().optional(),
  employmentType: z.string(),
  joinedAt: z.string().nullable(),
  isActive: z.boolean(),
  userId: z.string().nullable().optional(),
});
export type ErpEmployee = z.infer<typeof erpEmployeeSchema>;

export const erpDepartmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
});
export type ErpDepartment = z.infer<typeof erpDepartmentSchema>;

export const erpTimeOffPolicySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  paid: z.boolean(),
  requiresApproval: z.boolean(),
  annualDays: z.number(),
});
export type ErpTimeOffPolicy = z.infer<typeof erpTimeOffPolicySchema>;

export const erpContactSchema = z.object({
  id: z.number(),
  contactType: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  studentName: z.string().nullable(),
  studentGrade: z.string().nullable(),
  source: z.string().nullable(),
  budget: z.string().nullable().optional(),
  notes: z.string().nullable(),
  ownerId: z.number().nullable(),
});
export type ErpContact = z.infer<typeof erpContactSchema>;

export const erpPipelineStageSchema = z.object({
  id: z.number(),
  name: z.string(),
  position: z.number(),
});
export type ErpPipelineStage = z.infer<typeof erpPipelineStageSchema>;

export const erpPipelineSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  stages: z.array(erpPipelineStageSchema).default([]),
});
export type ErpPipeline = z.infer<typeof erpPipelineSchema>;

export const erpDealSchema = z.object({
  id: z.number(),
  title: z.string(),
  pipelineId: z.number(),
  stageId: z.number(),
  stageName: z.string().nullable().optional(),
  contactId: z.number().nullable(),
  contactName: z.string().nullable().optional(),
  value: z.string(),
  probability: z.number(),
  expectedCloseDate: z.string().nullable(),
  closedAt: z.string().nullable(),
  ownerId: z.number().nullable(),
});
export type ErpDeal = z.infer<typeof erpDealSchema>;

export const erpFeeStructureSchema = z.object({
  id: z.number(),
  name: z.string(),
  classLevel: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.string(),
  isActive: z.boolean(),
  components: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string(),
        amount: z.string(),
        isOptional: z.boolean().optional(),
      })
    )
    .default([]),
});
export type ErpFeeStructure = z.infer<typeof erpFeeStructureSchema>;

export const erpInvoiceItemSchema = z.object({
  id: z.number().optional(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
});

export const erpInvoiceSchema = z.object({
  id: z.number(),
  invoiceNumber: z.string(),
  studentUserId: z.string().nullable(),
  studentName: z.string().nullable().optional(),
  status: z.string(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  currency: z.string(),
  subtotal: z.string(),
  discount: z.string(),
  tax: z.string(),
  total: z.string(),
  amountPaid: z.string(),
  notes: z.string().nullable(),
  feeStructureId: z.number().nullable(),
  items: z.array(erpInvoiceItemSchema).optional(),
  itemsCount: z.number().optional(),
});
export type ErpInvoice = z.infer<typeof erpInvoiceSchema>;

export const erpPaymentSchema = z.object({
  id: z.number(),
  invoiceId: z.number(),
  amount: z.string(),
  currency: z.string(),
  method: z.string(),
  reference: z.string().nullable(),
  paidAt: z.string(),
  notes: z.string().nullable(),
  recordedBy: z.string().nullable(),
});
export type ErpPayment = z.infer<typeof erpPaymentSchema>;

export const erpAcademicYearSchema = z.object({
  id: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
});
export type ErpAcademicYear = z.infer<typeof erpAcademicYearSchema>;

export const erpClassSchema = z.object({
  id: z.number(),
  academicYearId: z.number(),
  name: z.string(),
  gradeLevel: z.string(),
  section: z.string().nullable(),
  capacity: z.number(),
  classTeacherId: z.number().nullable(),
  teacherName: z.string().nullable().optional(),
  room: z.string().nullable(),
  enrollmentCount: z.number().optional().default(0),
});
export type ErpClass = z.infer<typeof erpClassSchema>;

export const erpClassSubjectSchema = z.object({
  id: z.number(),
  classId: z.number(),
  name: z.string(),
  subjectCode: z.string().nullable(),
  teacherId: z.number().nullable(),
  teacherName: z.string().nullable().optional(),
});
export type ErpClassSubject = z.infer<typeof erpClassSubjectSchema>;

export const erpTimetableSlotSchema = z.object({
  id: z.number(),
  classId: z.number(),
  className: z.string().nullable().optional(),
  classSubjectId: z.number(),
  subjectName: z.string().nullable().optional(),
  teacherId: z.number().nullable().optional(),
  teacherName: z.string().nullable().optional(),
  weekday: z.string(),
  periodNumber: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().nullable(),
});
export type ErpTimetableSlot = z.infer<typeof erpTimetableSlotSchema>;

export const erpEnrollmentSchema = z.object({
  id: z.number(),
  studentUserId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  rollNumber: z.string().nullable(),
  status: z.string(),
  enrolledAt: z.string(),
  endedAt: z.string().nullable(),
});
export type ErpEnrollment = z.infer<typeof erpEnrollmentSchema>;

export const erpStudentAttendanceRecordSchema = z.object({
  id: z.number(),
  classId: z.number(),
  className: z.string().nullable().optional(),
  studentUserId: z.string(),
  studentName: z.string().nullable().optional(),
  attendanceDate: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
});
export type ErpStudentAttendanceRecord = z.infer<typeof erpStudentAttendanceRecordSchema>;

export const erpSchoolStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  class: z.string().nullable(),
  xp: z.number(),
  level: z.number(),
});
export type ErpSchoolStudent = z.infer<typeof erpSchoolStudentSchema>;

export const erpApprovalPolicySchema = z.object({
  id: z.number(),
  name: z.string(),
  requestType: z.string(),
  description: z.string().nullable(),
  minApprovals: z.number(),
  approverEmployeeIds: z.array(z.number()).nullable(),
  isActive: z.boolean(),
});
export type ErpApprovalPolicy = z.infer<typeof erpApprovalPolicySchema>;

export const erpRequestApprovalVoterSchema = z.object({
  voterUserId: z.string(),
  name: z.string(),
  vote: z.string(),
  comment: z.string().nullable(),
  votedAt: z.string(),
});
export type ErpRequestApprovalVoter = z.infer<typeof erpRequestApprovalVoterSchema>;

export const erpRequestApprovalSchema = z.object({
  id: z.number(),
  policyId: z.number().nullable(),
  requestType: z.string(),
  requestId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  minApprovals: z.number(),
  requestedByEmployeeId: z.number().nullable(),
  requestedByUserId: z.string().nullable(),
  requestedByName: z.string().nullable().optional(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
  voters: z.array(erpRequestApprovalVoterSchema).default([]),
});
export type ErpRequestApproval = z.infer<typeof erpRequestApprovalSchema>;

export const erpTimeOffRequestSchema = z.object({
  id: z.number(),
  employeeId: z.number(),
  policyId: z.number().nullable(),
  policyName: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  employeeName: z.string().nullable().optional(),
});
export type ErpTimeOffRequest = z.infer<typeof erpTimeOffRequestSchema>;

export const erpDashboardSchema = z.object({
  students: z.object({
    activeCount: z.number(),
    topClasses: z.array(z.object({ classId: z.number(), name: z.string(), count: z.number() })),
  }),
  employees: z.object({
    activeCount: z.number(),
    byDepartment: z.array(
      z.object({
        departmentId: z.number().nullable(),
        name: z.string().nullable(),
        count: z.number(),
      })
    ),
  }),
  finance: z.object({
    outstanding: z.number(),
    collectedThisMonth: z.number(),
    overdueCount: z.number(),
  }),
  crm: z.object({
    openDeals: z.number(),
    openDealsValue: z.number(),
    newContactsThisMonth: z.number(),
  }),
  attendance: z.object({
    date: z.string().nullable(),
    byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
  }),
  pendingApprovals: z.number(),
  payroll: z
    .object({
      runId: z.number(),
      periodStart: z.string(),
      periodEnd: z.string(),
      payslipCount: z.number(),
      totalNetPay: z.number(),
    })
    .nullable(),
});
export type ErpDashboard = z.infer<typeof erpDashboardSchema>;

// --- Query key factories ---

export const erpKeys = {
  all: ["erp"] as const,
  schools: () => [...erpKeys.all, "schools"] as const,
  school: (schoolId: number) => [...erpKeys.all, "school", schoolId] as const,
  roles: (schoolId: number) => [...erpKeys.all, "roles", schoolId] as const,
  tags: (schoolId: number) => [...erpKeys.all, "tags", schoolId] as const,
  employees: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "employees", schoolId, filters] as const,
  departments: (schoolId: number) => [...erpKeys.all, "departments", schoolId] as const,
  contacts: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "contacts", schoolId, filters] as const,
  pipelines: (schoolId: number) => [...erpKeys.all, "pipelines", schoolId] as const,
  deals: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "deals", schoolId, filters] as const,
  feeStructures: (schoolId: number) => [...erpKeys.all, "feeStructures", schoolId] as const,
  invoices: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "invoices", schoolId, filters] as const,
  invoice: (schoolId: number, invoiceId: number) =>
    [...erpKeys.all, "invoice", schoolId, invoiceId] as const,
  payments: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "payments", schoolId, filters] as const,
  classes: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "classes", schoolId, filters] as const,
  years: (schoolId: number) => [...erpKeys.all, "years", schoolId] as const,
  enrollments: (schoolId: number, classId: number) =>
    [...erpKeys.all, "enrollments", schoolId, classId] as const,
  schoolStudents: (schoolId: number) => [...erpKeys.all, "schoolStudents", schoolId] as const,
  subjects: (schoolId: number, classId: number) =>
    [...erpKeys.all, "subjects", schoolId, classId] as const,
  timetable: (schoolId: number, classId: number) =>
    [...erpKeys.all, "timetable", schoolId, classId] as const,
  attendance: (schoolId: number, filters: Record<string, unknown>) =>
    [...erpKeys.all, "attendance", schoolId, filters] as const,
  timeOff: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "timeOff", schoolId, filters] as const,
  timeOffPolicies: (schoolId: number) => [...erpKeys.all, "timeOffPolicies", schoolId] as const,
  approvalPolicies: (schoolId: number) => [...erpKeys.all, "approvalPolicies", schoolId] as const,
  requestApprovals: (schoolId: number, filters?: Record<string, unknown>) =>
    [...erpKeys.all, "requestApprovals", schoolId, filters] as const,
  dashboard: (schoolId: number) => [...erpKeys.all, "dashboard", schoolId] as const,
  stats: (schoolId: number, kind: string) => [...erpKeys.all, "stats", schoolId, kind] as const,
};

// --- API functions ---

export async function getErpSchools() {
  return fetchErpJson("/api/erp/schools", z.object({ schools: z.array(erpSchoolSchema) }));
}

export async function getErpPermissions() {
  return fetchErpJson(
    "/api/erp/permissions",
    z.object({ permissions: z.array(z.string()), systemRoles: z.array(z.unknown()) })
  );
}

export async function getErpRoles(schoolId: number) {
  return fetchErpJson("/api/erp/roles", z.object({ roles: z.array(erpRoleSchema) }), {
    schoolId,
  });
}

export async function createErpRole(
  schoolId: number,
  data: { key: string; name: string; description?: string; permissions: string[] }
) {
  return fetchErpJson("/api/erp/roles", z.object({ roleId: z.number() }), {
    schoolId,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateErpRole(
  schoolId: number,
  roleId: number,
  data: { name?: string; description?: string; permissions?: string[] }
) {
  return fetchErpJson(`/api/erp/roles/${roleId}`, z.object({ updated: z.boolean() }), {
    schoolId,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteErpRole(schoolId: number, roleId: number) {
  return fetchErpJson(`/api/erp/roles/${roleId}`, z.object({ deleted: z.boolean() }), {
    schoolId,
    method: "DELETE",
  });
}

export async function getErpRoleMembers(schoolId: number, roleId: number) {
  return fetchErpJson(
    `/api/erp/roles/${roleId}/members`,
    z.object({
      members: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          email: z.string(),
          assignedAt: z.string(),
        })
      ),
    }),
    { schoolId }
  );
}

export async function assignErpRoles(schoolId: number, userId: string, roleIds: number[]) {
  return fetchErpJson("/api/erp/roles/assign", z.object({ assigned: z.boolean() }), {
    schoolId,
    method: "POST",
    body: JSON.stringify({ userId, roleIds }),
  });
}

export async function seedErpSystemRoles(schoolId: number) {
  return fetchErpJson("/api/erp/roles/seed", z.object({ seeded: z.boolean() }), {
    schoolId,
    method: "POST",
  });
}

export async function getErpEmployees(
  schoolId: number,
  params?: { search?: string; departmentId?: number; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (params?.search) search.set("search", params.search);
  if (params?.departmentId) search.set("departmentId", String(params.departmentId));
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  return fetchErpJson(
    `/api/erp/hrm/employees${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({ items: z.array(erpEmployeeSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function getErpDepartments(schoolId: number) {
  return fetchErpJson(
    "/api/erp/hrm/departments",
    z.object({ departments: z.array(erpDepartmentSchema) }),
    { schoolId }
  );
}

export async function createErpDepartment(schoolId: number, name: string, description?: string) {
  return fetchErpJson("/api/erp/hrm/departments", z.object({ department: erpDepartmentSchema }), {
    schoolId,
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function createErpEmployee(
  schoolId: number,
  data: {
    firstName: string;
    lastName: string;
    workEmail?: string;
    phone?: string;
    departmentId?: number;
    positionId?: number;
    employmentType?: string;
    joinedAt?: string;
  }
) {
  return fetchErpJson("/api/erp/hrm/employees", z.object({ employee: erpEmployeeSchema }), {
    schoolId,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getErpTimeOffPolicies(schoolId: number) {
  return fetchErpJson(
    "/api/erp/hrm/time-off/policies",
    z.object({ policies: z.array(erpTimeOffPolicySchema) }),
    { schoolId }
  );
}

export async function getErpTimeOffRequests(schoolId: number, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return fetchErpJson(
    `/api/erp/hrm/time-off${qs}`,
    z.object({ items: z.array(erpTimeOffRequestSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function createErpTimeOffRequest(
  schoolId: number,
  data: {
    employeeId: number;
    policyId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }
) {
  return fetchErpJson("/api/erp/hrm/time-off", z.object({ request: erpTimeOffRequestSchema }), {
    schoolId,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function decideErpTimeOffRequest(
  schoolId: number,
  requestId: number,
  decision: "approved" | "refused"
) {
  return fetchErpJson(
    `/api/erp/hrm/time-off/${requestId}/decide`,
    z.object({ request: erpTimeOffRequestSchema }),
    {
      schoolId,
      method: "PUT",
      body: JSON.stringify({ decision }),
    }
  );
}

export async function getErpContacts(
  schoolId: number,
  params?: { contactType?: string; search?: string; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (params?.contactType) search.set("contactType", params.contactType);
  if (params?.search) search.set("search", params.search);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  return fetchErpJson(
    `/api/erp/crm/contacts${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({ items: z.array(erpContactSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function createErpContact(
  schoolId: number,
  data: {
    name: string;
    contactType?: string;
    email?: string;
    phone?: string;
    studentName?: string;
    studentGrade?: string;
    source?: string;
    notes?: string;
  }
) {
  return fetchErpJson(
    "/api/erp/crm/contacts",
    z.object({ contact: erpContactSchema.pick({ id: true }) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpPipelines(schoolId: number) {
  return fetchErpJson(
    "/api/erp/crm/pipelines",
    z.object({ pipelines: z.array(erpPipelineSchema) }),
    {
      schoolId,
    }
  );
}

export async function createErpPipeline(
  schoolId: number,
  data: { name: string; description?: string; stages: string[] }
) {
  return fetchErpJson(
    "/api/erp/crm/pipelines",
    z.object({ pipeline: erpPipelineSchema.pick({ id: true, name: true }) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpDeals(
  schoolId: number,
  params?: {
    pipelineId?: number;
    stageId?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const search = new URLSearchParams();
  if (params?.pipelineId) search.set("pipelineId", String(params.pipelineId));
  if (params?.stageId) search.set("stageId", String(params.stageId));
  if (params?.search) search.set("search", params.search);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  return fetchErpJson(
    `/api/erp/crm/deals${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({ items: z.array(erpDealSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function createErpDeal(
  schoolId: number,
  data: {
    title: string;
    pipelineId: number;
    stageId: number;
    contactId?: number;
    value?: string;
    probability?: number;
    expectedCloseDate?: string;
  }
) {
  return fetchErpJson("/api/erp/crm/deals", z.object({ deal: erpDealSchema.pick({ id: true }) }), {
    schoolId,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function moveErpDeal(schoolId: number, dealId: number, stageId: number) {
  return fetchErpJson(
    `/api/erp/crm/deals/${dealId}`,
    z.object({ deal: erpDealSchema.pick({ id: true }) }),
    {
      schoolId,
      method: "PUT",
      body: JSON.stringify({ stageId }),
    }
  );
}

export async function getCrmStats(schoolId: number, pipelineId?: number) {
  const qs = pipelineId ? `?pipelineId=${pipelineId}` : "";
  return fetchErpJson(
    `/api/erp/crm/stats${qs}`,
    z.object({
      pipelineId: z.number().nullable(),
      stages: z.array(
        z.object({
          stageId: z.number(),
          stageName: z.string(),
          position: z.number(),
          dealCount: z.number(),
          totalValue: z.union([z.string(), z.number()]),
        })
      ),
      totals: z.object({
        dealCount: z.number(),
        totalValue: z.union([z.string(), z.number()]),
      }),
    }),
    { schoolId }
  );
}

export async function getErpFeeStructures(schoolId: number) {
  return fetchErpJson(
    "/api/erp/finance/fee-structures",
    z.object({ items: z.array(erpFeeStructureSchema) }),
    { schoolId }
  );
}

export async function createErpFeeStructure(
  schoolId: number,
  data: {
    name: string;
    classLevel?: string;
    components: { name: string; amount: number; isOptional?: boolean }[];
  }
) {
  return fetchErpJson(
    "/api/erp/finance/fee-structures",
    z.object({ feeStructure: erpFeeStructureSchema }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpInvoices(
  schoolId: number,
  params?: { status?: string; search?: string; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.search) search.set("search", params.search);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  return fetchErpJson(
    `/api/erp/finance/invoices${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({ items: z.array(erpInvoiceSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function getErpInvoice(schoolId: number, invoiceId: number) {
  return fetchErpJson(
    `/api/erp/finance/invoices/${invoiceId}`,
    z.object({ invoice: erpInvoiceSchema }),
    { schoolId }
  );
}

export async function recordErpPayment(
  schoolId: number,
  invoiceId: number,
  data: { amount: number; method: string; reference?: string; paidAt?: string; notes?: string }
) {
  return fetchErpJson(
    `/api/erp/finance/invoices/${invoiceId}/payments`,
    z.object({ payment: erpPaymentSchema, invoice: erpInvoiceSchema }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function setErpInvoiceStatus(schoolId: number, invoiceId: number, status: string) {
  return fetchErpJson(
    `/api/erp/finance/invoices/${invoiceId}/status`,
    z.object({ invoice: erpInvoiceSchema }),
    {
      schoolId,
      method: "PUT",
      body: JSON.stringify({ status }),
    }
  );
}

export async function getErpPayments(
  schoolId: number,
  params?: { invoiceId?: number; from?: string; to?: string; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (params?.invoiceId) search.set("invoiceId", String(params.invoiceId));
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  return fetchErpJson(
    `/api/erp/finance/payments${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({
      items: z.array(erpPaymentSchema.extend({ invoiceNumber: z.string().nullable().optional() })),
      ...paginationMeta,
    }),
    { schoolId }
  );
}

export async function getFinanceStats(schoolId: number) {
  return fetchErpJson(
    "/api/erp/finance/stats",
    z.object({
      outstanding: z.number(),
      collected: z.number(),
      countByStatus: z.array(z.object({ status: z.string(), count: z.number() })),
    }),
    { schoolId }
  );
}

export async function getErpClasses(
  schoolId: number,
  params?: { yearId?: number; gradeLevel?: string; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (params?.yearId) search.set("yearId", String(params.yearId));
  if (params?.gradeLevel) search.set("gradeLevel", params.gradeLevel);
  search.set("pageSize", "100");
  if (params?.page) search.set("page", String(params.page));
  return fetchErpJson(
    `/api/erp/academics/classes${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({ items: z.array(erpClassSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function createErpClass(
  schoolId: number,
  data: {
    academicYearId: number;
    name: string;
    gradeLevel: string;
    section?: string;
    capacity?: number;
    room?: string;
    classTeacherId?: number;
  }
) {
  return fetchErpJson(
    "/api/erp/academics/classes",
    z.object({ class: z.object({ id: z.number() }) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpAcademicYears(schoolId: number) {
  return fetchErpJson(
    "/api/erp/academics/years",
    z.object({ items: z.array(erpAcademicYearSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function createErpAcademicYear(
  schoolId: number,
  data: { name: string; startDate: string; endDate: string; isCurrent?: boolean }
) {
  return fetchErpJson("/api/erp/academics/years", z.object({ year: erpAcademicYearSchema }), {
    schoolId,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getErpClassStudents(schoolId: number, classId: number) {
  return fetchErpJson(
    `/api/erp/academics/classes/${classId}/students?pageSize=100`,
    z.object({ items: z.array(erpEnrollmentSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function enrollErpStudent(
  schoolId: number,
  classId: number,
  data: { studentUserId: string; rollNumber?: string }
) {
  return fetchErpJson(
    `/api/erp/academics/classes/${classId}/enroll`,
    z.object({ enrollment: z.object({ id: z.number() }) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpClassSubjects(schoolId: number, classId: number) {
  return fetchErpJson(
    `/api/erp/academics/classes/${classId}/subjects`,
    z.object({ subjects: z.array(erpClassSubjectSchema) }),
    { schoolId }
  );
}

export async function createErpClassSubject(
  schoolId: number,
  classId: number,
  data: { name: string; subjectCode?: string; teacherId?: number }
) {
  return fetchErpJson(
    `/api/erp/academics/classes/${classId}/subjects`,
    z.object({ subject: z.object({ id: z.number() }) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpTimetable(schoolId: number, classId: number) {
  return fetchErpJson(
    `/api/erp/academics/timetable?classId=${classId}`,
    z.object({ slots: z.array(erpTimetableSlotSchema) }),
    { schoolId }
  );
}

export async function upsertErpTimetableSlot(
  schoolId: number,
  data: {
    classId: number;
    classSubjectId: number;
    weekday: string;
    periodNumber: number;
    startTime: string;
    endTime: string;
    room?: string;
  }
) {
  return fetchErpJson(
    "/api/erp/academics/timetable",
    z.object({ slot: z.object({ id: z.number() }) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpStudentAttendance(
  schoolId: number,
  params: { classId: number; date: string }
) {
  const search = new URLSearchParams();
  search.set("classId", String(params.classId));
  search.set("date", params.date);
  search.set("pageSize", "100");
  return fetchErpJson(
    `/api/erp/academics/attendance?${search.toString()}`,
    z.object({ items: z.array(erpStudentAttendanceRecordSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function bulkErpAttendance(
  schoolId: number,
  data: {
    classId: number;
    date: string;
    entries: { studentUserId: string; status: string; notes?: string }[];
  }
) {
  return fetchErpJson(
    "/api/erp/academics/attendance/bulk",
    z.object({ saved: z.number(), attendance: z.array(z.unknown()) }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpSchoolStudents(schoolId: number) {
  return fetchErpJson(
    "/api/schools/students",
    z.object({ students: z.array(erpSchoolStudentSchema) }),
    { schoolId }
  );
}

export async function getErpApprovalPolicies(schoolId: number) {
  return fetchErpJson(
    "/api/erp/approvals/policies",
    z.object({ policies: z.array(erpApprovalPolicySchema) }),
    { schoolId }
  );
}

export async function createErpApprovalPolicy(
  schoolId: number,
  data: {
    name: string;
    requestType: string;
    description?: string;
    minApprovals: number;
    approverEmployeeIds?: number[];
  }
) {
  return fetchErpJson(
    "/api/erp/approvals/policies",
    z.object({ policy: erpApprovalPolicySchema }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpRequestApprovals(schoolId: number, status?: string, page?: number) {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (page) search.set("page", String(page));
  return fetchErpJson(
    `/api/erp/approvals/requests${search.size > 0 ? `?${search.toString()}` : ""}`,
    z.object({ items: z.array(erpRequestApprovalSchema), ...paginationMeta }),
    { schoolId }
  );
}

export async function voteErpRequestApproval(
  schoolId: number,
  requestApprovalId: number,
  vote: "approve" | "refuse",
  comment?: string
) {
  return fetchErpJson(
    `/api/erp/approvals/requests/${requestApprovalId}/vote`,
    z.object({
      request: erpRequestApprovalSchema,
      approveCount: z.number(),
      refuseCount: z.number(),
    }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify({ vote, comment }),
    }
  );
}

export async function createErpRequestApproval(
  schoolId: number,
  data: { requestType: string; requestId: number; title: string; description?: string }
) {
  return fetchErpJson(
    "/api/erp/approvals/requests",
    z.object({ request: erpRequestApprovalSchema, existing: z.boolean() }),
    {
      schoolId,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function getErpDashboard(schoolId: number) {
  return fetchErpJson("/api/erp/dashboard", erpDashboardSchema, { schoolId });
}

// --- Server-side helpers (RSC pages) ---

export async function fetchErpSchoolsServer(cookieHeader: string) {
  const response = await fetch(`${backendUrl}/api/erp/schools`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const json = await response.json();
  return erpSchoolSchema.array().parse(json.data?.schools ?? []);
}
