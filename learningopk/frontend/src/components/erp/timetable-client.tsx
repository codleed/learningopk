"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useErp } from "@/components/erp/erp-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  getErpClasses,
  getErpClassSubjects,
  getErpTimetable,
  upsertErpTimetableSlot,
  type ErpClass,
  type ErpClassSubject,
  type ErpTimetableSlot,
} from "@/lib/erp-api";

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

type SlotDraft = {
  weekday: string;
  periodNumber: number;
};

export function TimetableClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [draft, setDraft] = useState<SlotDraft | null>(null);

  const classesQuery = useQuery({
    queryKey: ["erp", "classes", schoolId],
    queryFn: () => getErpClasses(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("TIMETABLE_VIEW"),
  });

  const classes: ErpClass[] = classesQuery.data?.items ?? [];
  const classId = selectedClassId ?? classes[0]?.id ?? null;

  const subjectsQuery = useQuery({
    queryKey: ["erp", "subjects", schoolId, classId],
    queryFn: () => getErpClassSubjects(schoolId!, classId!),
    enabled: Boolean(schoolId && classId),
    select: (data) => data.subjects,
  });

  const timetableQuery = useQuery({
    queryKey: ["erp", "timetable", schoolId, classId],
    queryFn: () => getErpTimetable(schoolId!, classId!),
    enabled: Boolean(schoolId && classId),
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: {
      classId: number;
      classSubjectId: number;
      weekday: string;
      periodNumber: number;
      startTime: string;
      endTime: string;
      room?: string;
    }) => upsertErpTimetableSlot(schoolId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["erp"] });
      setDraft(null);
    },
  });

  if (!schoolId) return null;

  if (!hasPermission("TIMETABLE_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include timetable viewing for this school."
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
        description="Create classes first, then add subjects and build the timetable."
      />
    );
  }

  const slots: ErpTimetableSlot[] = timetableQuery.data?.slots ?? [];
  const subjects: ErpClassSubject[] = subjectsQuery.data ?? [];
  const periods = Array.from(new Set(slots.map((s) => s.periodNumber))).sort((a, b) => a - b);
  const periodRows = periods.length > 0 ? periods : [1, 2, 3, 4, 5, 6, 7, 8];

  const slotFor = (weekday: string, period: number) =>
    slots.find((s) => s.weekday === weekday && s.periodNumber === period);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-text-secondary">Weekly schedule per class</p>
        </div>
        <Select
          className="h-10 w-56"
          value={String(classId ?? "")}
          onChange={(event) => setSelectedClassId(Number(event.target.value))}
          aria-label="Select class"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={String(cls.id)}>
              {cls.name} (Grade {cls.gradeLevel})
            </option>
          ))}
        </Select>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects"
          description="Add subjects to this class before scheduling periods."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {classes.find((c) => c.id === classId)?.name ?? "Class"} — Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardBody>
            {timetableQuery.isPending ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-2 font-medium text-text-secondary">Period</th>
                      {WEEKDAYS.map((day) => (
                        <th key={day} className="p-2 font-medium text-text-secondary">
                          {DAY_LABELS[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.map((period) => (
                      <tr key={period} className="border-b border-border/60">
                        <td className="p-2 font-semibold text-text-secondary">{period}</td>
                        {WEEKDAYS.map((day) => {
                          const slot = slotFor(day, period);
                          if (slot) {
                            return (
                              <td key={day} className="p-1.5">
                                <div className="rounded-md border border-border bg-bg-subtle px-2 py-1.5">
                                  <div className="font-medium">{slot.subjectName ?? "—"}</div>
                                  <div className="text-xs text-text-secondary">
                                    {slot.startTime}–{slot.endTime}
                                  </div>
                                  {slot.room ? (
                                    <div className="text-xs text-text-secondary">
                                      Room {slot.room}
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            );
                          }
                          if (hasPermission("TIMETABLE_MANAGE")) {
                            return (
                              <td key={day} className="p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDraft({ weekday: day, periodNumber: period })}
                                  className="w-full rounded-md border border-dashed border-border px-2 py-2 text-xs text-text-secondary hover:border-accent-primary hover:text-accent-primary"
                                >
                                  + Add
                                </button>
                              </td>
                            );
                          }
                          return <td key={day} className="p-1.5" />;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {draft && subjects.length > 0 ? (
        <SlotDialog
          classId={classId!}
          subjects={subjects}
          draft={draft}
          onClose={() => setDraft(null)}
          saving={upsertMutation.isPending}
          error={upsertMutation.error instanceof Error ? upsertMutation.error.message : null}
          onSave={(payload) => upsertMutation.mutate(payload)}
        />
      ) : null}
    </div>
  );
}

function SlotDialog({
  classId,
  subjects,
  draft,
  onClose,
  onSave,
  saving,
  error,
}: {
  classId: number;
  subjects: ErpClassSubject[];
  draft: SlotDraft;
  onClose: () => void;
  onSave: (payload: {
    classId: number;
    classSubjectId: number;
    weekday: string;
    periodNumber: number;
    startTime: string;
    endTime: string;
    room?: string;
  }) => void;
  saving: boolean;
  error: string | null;
}) {
  const [classSubjectId, setClassSubjectId] = useState<number>(subjects[0]?.id ?? 0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [room, setRoom] = useState("");

  const canSave = classSubjectId > 0 && startTime && endTime;

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>
            Add Period — {DAY_LABELS[draft.weekday]} P{draft.periodNumber}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-text-secondary">Subject</span>
              <Select
                className="h-10"
                value={String(classSubjectId)}
                onChange={(event) => setClassSubjectId(Number(event.target.value))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                    {subject.teacherName ? ` — ${subject.teacherName}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block text-text-secondary">Start time</span>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-text-secondary">End time</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block text-text-secondary">Room (optional)</span>
              <Input
                type="text"
                value={room}
                placeholder="e.g. Lab 1"
                onChange={(event) => setRoom(event.target.value)}
              />
            </label>
            {error ? <Badge variant="danger">{error}</Badge> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSave || saving}
            onClick={() =>
              onSave({
                classId,
                classSubjectId,
                weekday: draft.weekday,
                periodNumber: draft.periodNumber,
                startTime,
                endTime,
                ...(room ? { room } : {}),
              })
            }
          >
            {saving ? <Spinner size="sm" /> : "Save Slot"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
