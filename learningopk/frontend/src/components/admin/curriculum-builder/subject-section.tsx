"use client";

import { useState, type FormEvent } from "react";

import { createAdminCurriculumSubject, deleteAdminCurriculumSubject } from "@/lib/admin-api";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { useToast } from "../../ui/toast";
import { TabButton } from "./tab-button";
import type { ClassOption, EntityModeTab, SectionCommonProps, SubjectOption } from "./types";
import { toSlug } from "./utils";

type SubjectSectionProps = SectionCommonProps & {
  classOptions: ClassOption[];
  subjectOptions: SubjectOption[];
};

export function SubjectSection({
  classOptions,
  subjectOptions,
  isSubmitting,
  setIsSubmitting,
  refreshTree,
}: SubjectSectionProps) {
  const { pushToast } = useToast();
  const [activeSubjectModeTab, setActiveSubjectModeTab] = useState<EntityModeTab>("add");
  const [subjectBoardClassId, setSubjectBoardClassId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [manageSubjectId, setManageSubjectId] = useState("");

  const submitSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardClassId = Number(subjectBoardClassId);
    const normalizedName = subjectName.trim();
    if (!boardClassId || !normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumSubject({
        boardClassId,
        name: normalizedName,
        slug: toSlug(normalizedName),
        ...(subjectDescription.trim().length > 0 ? { description: subjectDescription.trim() } : {}),
      });
      setSubjectName("");
      setSubjectDescription("");
      await refreshTree();
      pushToast({ title: "Subject created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create subject", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSubject = async () => {
    const subjectId = Number(manageSubjectId);
    if (!subjectId) {
      pushToast({ title: "Select a subject first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this subject and all related chapters?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumSubject(subjectId);
      setManageSubjectId("");
      await refreshTree();
      pushToast({ title: "Subject deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete subject", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="curriculum-subject-mode-tabs">
        <TabButton
          testId="curriculum-subject-mode-add"
          isActive={activeSubjectModeTab === "add"}
          onClick={() => setActiveSubjectModeTab("add")}
        >
          Add
        </TabButton>
        <TabButton
          testId="curriculum-subject-mode-manage"
          isActive={activeSubjectModeTab === "manage"}
          onClick={() => setActiveSubjectModeTab("manage")}
        >
          Manage
        </TabButton>
      </div>

      {activeSubjectModeTab === "add" ? (
        <form className="space-y-2" data-testid="curriculum-subject-form" onSubmit={submitSubject}>
          <p className="text-sm font-semibold text-text-primary">Add Subject</p>
          <Select
            data-testid="curriculum-subject-class-select"
            value={subjectBoardClassId}
            onChange={(event) => setSubjectBoardClassId(event.target.value)}
          >
            <option value="">Select class</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-subject-name-input"
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="Subject name (e.g. Physics)"
          />
          <Input
            data-testid="curriculum-subject-description-input"
            value={subjectDescription}
            onChange={(event) => setSubjectDescription(event.target.value)}
            placeholder="Description (optional)"
          />
          <Button
            data-testid="curriculum-subject-submit"
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
          >
            Add subject
          </Button>
        </form>
      ) : (
        <div
          className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3"
          data-testid="curriculum-subject-manage"
        >
          <p className="text-sm font-semibold text-text-primary">Delete Subject</p>
          <Select
            data-testid="curriculum-subject-manage-select"
            value={manageSubjectId}
            onChange={(event) => setManageSubjectId(event.target.value)}
          >
            <option value="">Select subject</option>
            {subjectOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="curriculum-subject-manage-delete"
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={deleteSubject}
            >
              Delete subject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
