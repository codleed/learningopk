"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useErp } from "@/components/erp/erp-provider";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import {
  createErpAcademicYear,
  createErpClass,
  createErpClassSubject,
  enrollErpStudent,
  erpKeys,
  getErpAcademicYears,
  getErpClassStudents,
  getErpClassSubjects,
  getErpClasses,
  getErpEmployees,
  getErpSchoolStudents,
} from "@/lib/erp-api";

const ENROLLMENT_STATUS_VARIANTS: Record<
  string,
  "success" | "danger" | "warning" | "primary" | "neutral"
> = {
  active: "success",
  graduated: "primary",
  suspended: "warning",
  withdrawn: "danger",
};

function enrollmentStatusVariant(status: string) {
  return ENROLLMENT_STATUS_VARIANTS[status] ?? "neutral";
}

function formatStatus(status: string): string {
  return status.replace("_", " ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function FieldLabel({ children }: { children: string }) {
  return <span className="mb-1.5 block text-sm font-medium text-text-primary">{children}</span>;
}

export function ErpClassesClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const queryClient = useQueryClient();

  const canManage = hasPermission("CLASSES_MANAGE");
  const canViewEnrollments = hasPermission("ENROLLMENTS_VIEW");
  const canManageEnrollments = hasPermission("ENROLLMENTS_MANAGE");
  const canListSchoolStudents = Boolean(activeSchool?.isOwner);

  const [yearIdOverride, setYearIdOverride] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [yearForm, setYearForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: true,
  });

  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    gradeLevel: "9",
    section: "",
    capacity: "40",
    room: "",
    classTeacherId: "",
  });

  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    subjectCode: "",
    teacherId: "",
  });

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ studentUserId: "", rollNumber: "" });

  const yearsQuery = useQuery({
    queryKey: erpKeys.years(schoolId!),
    queryFn: () => getErpAcademicYears(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("CLASSES_VIEW"),
  });

  const years = yearsQuery.data?.items ?? [];
  const effectiveYearId =
    yearIdOverride ?? years.find((year) => year.isCurrent)?.id ?? years[0]?.id ?? null;

  const classesQuery = useQuery({
    queryKey: erpKeys.classes(schoolId!, { yearId: effectiveYearId ?? undefined }),
    queryFn: () => getErpClasses(schoolId!, { yearId: effectiveYearId ?? undefined }),
    enabled: Boolean(schoolId) && hasPermission("CLASSES_VIEW") && effectiveYearId !== null,
  });

  const classes = classesQuery.data?.items ?? [];
  const selectedClass =
    selectedClassId !== null ? (classes.find((cls) => cls.id === selectedClassId) ?? null) : null;

  const studentsQuery = useQuery({
    queryKey: erpKeys.enrollments(schoolId!, selectedClassId!),
    queryFn: () => getErpClassStudents(schoolId!, selectedClassId!),
    enabled: Boolean(schoolId) && selectedClassId !== null && canViewEnrollments,
  });

  const subjectsQuery = useQuery({
    queryKey: erpKeys.subjects(schoolId!, selectedClassId!),
    queryFn: () => getErpClassSubjects(schoolId!, selectedClassId!),
    enabled: Boolean(schoolId) && selectedClassId !== null,
  });

  const employeesQuery = useQuery({
    queryKey: erpKeys.employees(schoolId!, { pageSize: 100 }),
    queryFn: () => getErpEmployees(schoolId!, { pageSize: 100 }),
    enabled:
      Boolean(schoolId) &&
      hasPermission("EMPLOYEES_VIEW") &&
      (classDialogOpen || subjectDialogOpen),
  });

  const schoolStudentsQuery = useQuery({
    queryKey: erpKeys.schoolStudents(schoolId!),
    queryFn: () => getErpSchoolStudents(schoolId!),
    enabled: Boolean(schoolId) && enrollDialogOpen && canListSchoolStudents,
  });

  const employees = employeesQuery.data?.items ?? [];
  const schoolStudents = schoolStudentsQuery.data?.students ?? [];
  const students = studentsQuery.data?.items ?? [];
  const subjects = subjectsQuery.data?.subjects ?? [];
  const useStudentSelect =
    canListSchoolStudents && schoolStudentsQuery.isSuccess && schoolStudents.length > 0;

  const invalidateErp = () => {
    void queryClient.invalidateQueries({ queryKey: erpKeys.all });
  };

  const createYearMutation = useMutation({
    mutationFn: () =>
      createErpAcademicYear(schoolId!, {
        name: yearForm.name,
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
        isCurrent: yearForm.isCurrent,
      }),
    onSuccess: () => {
      invalidateErp();
      setYearDialogOpen(false);
    },
  });

  const createClassMutation = useMutation({
    mutationFn: () => {
      const capacity = Number.parseInt(classForm.capacity, 10);
      return createErpClass(schoolId!, {
        academicYearId: effectiveYearId!,
        name: classForm.name,
        gradeLevel: classForm.gradeLevel,
        ...(classForm.section ? { section: classForm.section } : {}),
        ...(Number.isSafeInteger(capacity) && capacity > 0 ? { capacity } : {}),
        ...(classForm.room ? { room: classForm.room } : {}),
        ...(classForm.classTeacherId ? { classTeacherId: Number(classForm.classTeacherId) } : {}),
      });
    },
    onSuccess: () => {
      invalidateErp();
      setClassDialogOpen(false);
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: () =>
      createErpClassSubject(schoolId!, selectedClassId!, {
        name: subjectForm.name,
        ...(subjectForm.subjectCode ? { subjectCode: subjectForm.subjectCode } : {}),
        ...(subjectForm.teacherId ? { teacherId: Number(subjectForm.teacherId) } : {}),
      }),
    onSuccess: () => {
      invalidateErp();
      setSubjectDialogOpen(false);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollErpStudent(schoolId!, selectedClassId!, {
        studentUserId: enrollForm.studentUserId,
        ...(enrollForm.rollNumber ? { rollNumber: enrollForm.rollNumber } : {}),
      }),
    onSuccess: () => {
      invalidateErp();
      setEnrollDialogOpen(false);
    },
  });

  function openYearDialog() {
    createYearMutation.reset();
    setYearForm({ name: "", startDate: "", endDate: "", isCurrent: true });
    setYearDialogOpen(true);
  }

  function openClassDialog() {
    createClassMutation.reset();
    setClassForm({
      name: "",
      gradeLevel: "9",
      section: "",
      capacity: "40",
      room: "",
      classTeacherId: "",
    });
    setClassDialogOpen(true);
  }

  function openSubjectDialog() {
    createSubjectMutation.reset();
    setSubjectForm({ name: "", subjectCode: "", teacherId: "" });
    setSubjectDialogOpen(true);
  }

  function openEnrollDialog() {
    enrollMutation.reset();
    setEnrollForm({ studentUserId: "", rollNumber: "" });
    setEnrollDialogOpen(true);
  }

  const yearName = years.find((year) => year.id === effectiveYearId)?.name ?? null;

  const yearDialogNode = (
    <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
      <DialogHeader>
        <DialogTitle>Create Academic Year</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. 2026-27"
          value={yearForm.name}
          onChange={(event) => setYearForm({ ...yearForm, name: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start date"
            type="date"
            value={yearForm.startDate}
            onChange={(event) => setYearForm({ ...yearForm, startDate: event.target.value })}
          />
          <Input
            label="End date"
            type="date"
            value={yearForm.endDate}
            onChange={(event) => setYearForm({ ...yearForm, endDate: event.target.value })}
          />
        </div>
        <Checkbox
          label="Set as current academic year"
          checked={yearForm.isCurrent}
          onChange={(event) => setYearForm({ ...yearForm, isCurrent: event.target.checked })}
        />
        {createYearMutation.isError ? (
          <p className="text-sm text-accent-danger">{errorMessage(createYearMutation.error)}</p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => setYearDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          loading={createYearMutation.isPending}
          disabled={!yearForm.name || !yearForm.startDate || !yearForm.endDate}
          onClick={() => createYearMutation.mutate()}
        >
          Create Year
        </Button>
      </DialogFooter>
    </Dialog>
  );

  const classDialogNode = (
    <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
      <DialogHeader>
        <DialogTitle>Add Class</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <Input
          label="Class name"
          placeholder="e.g. 9-A"
          value={classForm.name}
          onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FieldLabel>Grade level</FieldLabel>
            <Select
              className="h-10"
              value={classForm.gradeLevel}
              onChange={(event) => setClassForm({ ...classForm, gradeLevel: event.target.value })}
            >
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
            </Select>
          </div>
          <Input
            label="Section"
            placeholder="e.g. A"
            value={classForm.section}
            onChange={(event) => setClassForm({ ...classForm, section: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={classForm.capacity}
            onChange={(event) => setClassForm({ ...classForm, capacity: event.target.value })}
          />
          <Input
            label="Room"
            placeholder="e.g. 204"
            value={classForm.room}
            onChange={(event) => setClassForm({ ...classForm, room: event.target.value })}
          />
        </div>
        {employees.length > 0 ? (
          <div className="space-y-1.5">
            <FieldLabel>Class teacher</FieldLabel>
            <Select
              className="h-10"
              value={classForm.classTeacherId}
              onChange={(event) =>
                setClassForm({ ...classForm, classTeacherId: event.target.value })
              }
            >
              <option value="">Not assigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.id)}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {createClassMutation.isError ? (
          <p className="text-sm text-accent-danger">{errorMessage(createClassMutation.error)}</p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => setClassDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          loading={createClassMutation.isPending}
          disabled={!classForm.name || !classForm.gradeLevel}
          onClick={() => createClassMutation.mutate()}
        >
          Create Class
        </Button>
      </DialogFooter>
    </Dialog>
  );

  const subjectDialogNode = (
    <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
      <DialogHeader>
        <DialogTitle>Add Subject</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <Input
          label="Subject name"
          placeholder="e.g. Mathematics"
          value={subjectForm.name}
          onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })}
        />
        <Input
          label="Subject code"
          placeholder="e.g. MATH-9"
          value={subjectForm.subjectCode}
          onChange={(event) => setSubjectForm({ ...subjectForm, subjectCode: event.target.value })}
        />
        {employees.length > 0 ? (
          <div className="space-y-1.5">
            <FieldLabel>Teacher</FieldLabel>
            <Select
              className="h-10"
              value={subjectForm.teacherId}
              onChange={(event) =>
                setSubjectForm({ ...subjectForm, teacherId: event.target.value })
              }
            >
              <option value="">Not assigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.id)}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {createSubjectMutation.isError ? (
          <p className="text-sm text-accent-danger">{errorMessage(createSubjectMutation.error)}</p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => setSubjectDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          loading={createSubjectMutation.isPending}
          disabled={!subjectForm.name}
          onClick={() => createSubjectMutation.mutate()}
        >
          Add Subject
        </Button>
      </DialogFooter>
    </Dialog>
  );

  const enrollDialogNode = (
    <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
      <DialogHeader>
        <DialogTitle>Enroll Student</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        {canListSchoolStudents && schoolStudentsQuery.isPending ? (
          <div className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        ) : useStudentSelect ? (
          <div className="space-y-1.5">
            <FieldLabel>Student</FieldLabel>
            <Select
              className="h-10"
              value={enrollForm.studentUserId}
              onChange={(event) =>
                setEnrollForm({ ...enrollForm, studentUserId: event.target.value })
              }
            >
              <option value="">Select a student</option>
              {schoolStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.email})
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <FieldLabel>Student user ID</FieldLabel>
            <Input
              placeholder="Paste the student's platform user ID"
              value={enrollForm.studentUserId}
              onChange={(event) =>
                setEnrollForm({ ...enrollForm, studentUserId: event.target.value })
              }
            />
            <p className="text-xs text-text-secondary">
              Student directory lookup is available to school administrators only.
            </p>
          </div>
        )}
        <Input
          label="Roll number"
          placeholder="e.g. 9-A-05"
          value={enrollForm.rollNumber}
          onChange={(event) => setEnrollForm({ ...enrollForm, rollNumber: event.target.value })}
        />
        {enrollMutation.isError ? (
          <p className="text-sm text-accent-danger">{errorMessage(enrollMutation.error)}</p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => setEnrollDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          loading={enrollMutation.isPending}
          disabled={!enrollForm.studentUserId}
          onClick={() => enrollMutation.mutate()}
        >
          Enroll
        </Button>
      </DialogFooter>
    </Dialog>
  );

  if (!schoolId) return null;

  if (!hasPermission("CLASSES_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include class viewing for this school."
      />
    );
  }

  if (yearsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (yearsQuery.isError) {
    return (
      <EmptyState
        title="Failed to load academic years"
        description={errorMessage(yearsQuery.error)}
      />
    );
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Classes</h1>
        <p className="text-sm text-text-secondary">
          Academic years, classes, and student enrollments
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="h-10 w-44"
          aria-label="Academic year"
          value={String(effectiveYearId ?? "")}
          onChange={(event) => {
            setYearIdOverride(Number(event.target.value));
            setSelectedClassId(null);
          }}
        >
          {years.map((year) => (
            <option key={year.id} value={String(year.id)}>
              {year.name}
              {year.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </Select>
        {canManage ? (
          <Button variant="secondary" onClick={openYearDialog}>
            Add Year
          </Button>
        ) : null}
        {canManage && effectiveYearId !== null ? (
          <Button onClick={openClassDialog}>Add Class</Button>
        ) : null}
      </div>
    </div>
  );

  const gridSection = (
    <div className="space-y-4">
      {classesQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : classesQuery.isError ? (
        <EmptyState title="Failed to load classes" description={errorMessage(classesQuery.error)} />
      ) : classes.length === 0 ? (
        <EmptyState
          title="No classes in this year"
          description={
            canManage
              ? "Create the first class for this academic year."
              : "No classes have been created for this academic year yet."
          }
          action={canManage ? <Button onClick={openClassDialog}>Add Class</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="cursor-pointer transition-colors hover:border-accent-primary/40"
              onClick={() => setSelectedClassId(cls.id)}
            >
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{cls.name}</div>
                    <div className="text-sm text-text-secondary">
                      Grade {cls.gradeLevel}
                      {cls.section ? ` · Section ${cls.section}` : ""}
                    </div>
                  </div>
                  <Badge variant="neutral">Grade {cls.gradeLevel}</Badge>
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Enrolled</span>
                    <span className="font-medium">
                      {cls.enrollmentCount} / {cls.capacity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Class teacher</span>
                    <span className="font-medium">{cls.teacherName ?? "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Room</span>
                    <span className="font-medium">{cls.room ?? "—"}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const detailSection = selectedClass ? (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => setSelectedClassId(null)}
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            ← All classes
          </button>
          <h1 className="mt-1 text-2xl font-bold">{selectedClass.name}</h1>
          <p className="text-sm text-text-secondary">
            Grade {selectedClass.gradeLevel}
            {selectedClass.section ? ` · Section ${selectedClass.section}` : ""}
            {yearName ? ` · ${yearName}` : ""}
          </p>
        </div>
        {canManageEnrollments ? <Button onClick={openEnrollDialog}>Enroll Student</Button> : null}
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">Enrolled</div>
              <div className="mt-1 text-lg font-semibold">
                {selectedClass.enrollmentCount} / {selectedClass.capacity}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">
                Class teacher
              </div>
              <div className="mt-1 truncate text-lg font-semibold">
                {selectedClass.teacherName ?? "Unassigned"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">Room</div>
              <div className="mt-1 text-lg font-semibold">{selectedClass.room ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">
                Academic year
              </div>
              <div className="mt-1 truncate text-lg font-semibold">{yearName ?? "—"}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Students ({students.length})</CardTitle>
          {canManageEnrollments ? (
            <Button size="sm" onClick={openEnrollDialog}>
              Enroll Student
            </Button>
          ) : null}
        </CardHeader>
        <CardBody className="p-0">
          {!canViewEnrollments ? (
            <EmptyState
              title="Enrollments hidden"
              description="Your role does not include enrollment viewing for this school."
              className="border-none bg-transparent"
            />
          ) : studentsQuery.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : studentsQuery.isError ? (
            <EmptyState
              title="Failed to load students"
              description={errorMessage(studentsQuery.error)}
              className="border-none bg-transparent"
            />
          ) : students.length === 0 ? (
            <EmptyState
              title="No students enrolled"
              description="Enroll students to build this class roster."
              className="border-none bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-2.5 font-medium">Roll</th>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-border-default last:border-b-0">
                      <td className="px-4 py-2.5 text-text-secondary">
                        {student.rollNumber ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{student.name}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{student.email ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={enrollmentStatusVariant(student.status)}>
                          {formatStatus(student.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{student.enrolledAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Subjects ({subjects.length})</CardTitle>
          {canManage ? (
            <Button size="sm" variant="secondary" onClick={openSubjectDialog}>
              Add Subject
            </Button>
          ) : null}
        </CardHeader>
        <CardBody className="p-0">
          {subjectsQuery.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : subjectsQuery.isError ? (
            <EmptyState
              title="Failed to load subjects"
              description={errorMessage(subjectsQuery.error)}
              className="border-none bg-transparent"
            />
          ) : subjects.length === 0 ? (
            <EmptyState
              title="No subjects"
              description="Add subjects to this class to build its timetable."
              className="border-none bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-2.5 font-medium">Subject</th>
                    <th className="px-4 py-2.5 font-medium">Code</th>
                    <th className="px-4 py-2.5 font-medium">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-border-default last:border-b-0">
                      <td className="px-4 py-2.5 font-medium">{subject.name}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {subject.subjectCode ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {subject.teacherName ?? "Unassigned"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  ) : (
    gridSection
  );

  return (
    <div className="space-y-6">
      {header}
      {years.length === 0 ? (
        <EmptyState
          title="No academic years yet"
          description="Create an academic year before adding classes."
          action={
            canManage ? <Button onClick={openYearDialog}>Create Academic Year</Button> : undefined
          }
        />
      ) : (
        detailSection
      )}
      {yearDialogNode}
      {classDialogNode}
      {subjectDialogNode}
      {enrollDialogNode}
    </div>
  );
}
