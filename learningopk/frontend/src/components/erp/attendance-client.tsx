"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useErp } from "@/components/erp/erp-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  bulkErpAttendance,
  getErpClasses,
  getErpClassStudents,
  getErpStudentAttendance,
  type ErpClass,
} from "@/lib/erp-api";

type RosterStudent = {
  id: number;
  studentUserId: string;
  name: string;
  rollNumber: string | null;
};

const STATUS_OPTIONS = ["present", "absent", "late", "leave", "half_day"] as const;

const STATUS_BUTTON_STYLES: Record<string, string> = {
  present: "bg-accent-success text-white",
  absent: "bg-accent-danger text-white",
  late: "bg-accent-warning text-white",
  leave: "bg-bg-subtle text-text-primary border border-border",
  half_day: "bg-bg-subtle text-text-primary border border-border",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(todayIso());
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const classesQuery = useQuery({
    queryKey: ["erp", "classes", schoolId],
    queryFn: () => getErpClasses(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("ATTENDANCE_VIEW"),
  });

  const classes: ErpClass[] = classesQuery.data?.items ?? [];
  const classId = selectedClassId ?? classes[0]?.id ?? null;

  const rosterQuery = useQuery({
    queryKey: ["erp", "enrollments", schoolId, classId],
    queryFn: () => getErpClassStudents(schoolId!, classId!),
    enabled: Boolean(schoolId && classId),
  });

  const attendanceQuery = useQuery({
    queryKey: ["erp", "attendance", schoolId, classId, date],
    queryFn: () => getErpStudentAttendance(schoolId!, { classId: classId!, date }),
    enabled: Boolean(schoolId && classId && date),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      classId: number;
      date: string;
      entries: { studentUserId: string; status: string }[];
    }) => bulkErpAttendance(schoolId!, payload),
    onSuccess: () => {
      setOverrides({});
      void queryClient.invalidateQueries({ queryKey: ["erp"] });
    },
  });

  const roster: RosterStudent[] = useMemo(
    () =>
      (rosterQuery.data?.items ?? []).map((enrollment) => ({
        id: enrollment.id,
        studentUserId: enrollment.studentUserId,
        name: enrollment.name,
        rollNumber: enrollment.rollNumber,
      })),
    [rosterQuery.data]
  );

  const recordedStatuses = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of attendanceQuery.data?.items ?? []) {
      map.set(record.studentUserId, record.status);
    }
    return map;
  }, [attendanceQuery.data]);

  const statusFor = (student: RosterStudent): string =>
    overrides[student.studentUserId] ?? recordedStatuses.get(student.studentUserId) ?? "present";

  const dirtyCount = Object.keys(overrides).length;

  if (!schoolId) return null;

  if (!hasPermission("ATTENDANCE_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include attendance viewing for this school."
      />
    );
  }

  if (classesQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No classes yet"
        description="Create classes and enroll students before taking attendance."
      />
    );
  }

  const canSave = hasPermission("ATTENDANCE_MANAGE") && dirtyCount > 0 && !saveMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-text-secondary">Daily student attendance per class</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            className="h-10 w-44"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setOverrides({});
            }}
          />
          <Select
            className="h-10 w-56"
            value={String(classId ?? "")}
            onChange={(event) => {
              setSelectedClassId(Number(event.target.value));
              setOverrides({});
            }}
            aria-label="Select class"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={String(cls.id)}>
                {cls.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {classes.find((c) => c.id === classId)?.name ?? "Class"} — {date}
            {dirtyCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-accent-warning">
                {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {rosterQuery.isPending || attendanceQuery.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : roster.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">
              No students enrolled in this class yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {roster.map((student) => {
                const status = statusFor(student);
                return (
                  <div
                    key={student.studentUserId}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium">{student.name}</div>
                      <div className="text-xs text-text-secondary">
                        {student.rollNumber ? `Roll #${student.rollNumber}` : "No roll number"}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={!hasPermission("ATTENDANCE_MANAGE")}
                          onClick={() =>
                            setOverrides((prev) => ({
                              ...prev,
                              [student.studentUserId]: option,
                            }))
                          }
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed ${
                            status === option
                              ? (STATUS_BUTTON_STYLES[option] ?? "bg-accent-primary text-white")
                              : "border border-border text-text-secondary hover:bg-bg-subtle"
                          }`}
                        >
                          {option.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {hasPermission("ATTENDANCE_MANAGE") ? (
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() =>
              classId &&
              saveMutation.mutate({
                classId,
                date,
                entries: roster.map((student) => ({
                  studentUserId: student.studentUserId,
                  status: statusFor(student),
                })),
              })
            }
          >
            {saveMutation.isPending ? <Spinner size="sm" /> : "Save Attendance"}
          </Button>
          {saveMutation.isError ? (
            <span className="text-sm text-accent-danger">
              {saveMutation.error instanceof Error ? saveMutation.error.message : "Save failed"}
            </span>
          ) : null}
          {saveMutation.isSuccess && dirtyCount === 0 ? (
            <span className="text-sm text-accent-success">Attendance saved.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
