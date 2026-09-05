"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createAdminCurriculumClass,
  deleteAdminCurriculumClass,
  updateAdminCurriculumClass,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { useToast } from "../../ui/toast";
import { TabButton } from "./tab-button";
import type { ClassOption, EntityModeTab, SectionCommonProps } from "./types";
import { toSlug } from "./utils";

type ClassSectionProps = SectionCommonProps & {
  boards: AdminCurriculumBoard[];
  classOptions: ClassOption[];
};

export function ClassSection({
  boards,
  classOptions,
  isSubmitting,
  setIsSubmitting,
  refreshTree,
}: ClassSectionProps) {
  const { pushToast } = useToast();
  const [activeClassModeTab, setActiveClassModeTab] = useState<EntityModeTab>("add");
  const [classBoardId, setClassBoardId] = useState("");
  const [className, setClassName] = useState("");
  const [manageClassId, setManageClassId] = useState("");
  const [manageClassName, setManageClassName] = useState("");

  useEffect(() => {
    const selectedClass = classOptions.find((option) => option.id === Number(manageClassId));
    setManageClassName(selectedClass?.name ?? "");
  }, [classOptions, manageClassId]);

  const submitClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardId = Number(classBoardId);
    const normalizedName = className.trim();
    if (!boardId || !normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumClass({
        boardId,
        name: normalizedName,
        slug: toSlug(normalizedName),
      });
      setClassName("");
      await refreshTree();
      pushToast({ title: "Class created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateClass = async () => {
    const classId = Number(manageClassId);
    const normalizedName = manageClassName.trim();
    if (!classId || !normalizedName) {
      pushToast({ title: "Select a class and provide a name", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumClass({
        classId,
        name: normalizedName,
        slug: toSlug(normalizedName),
      });
      await refreshTree();
      pushToast({ title: "Class updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteClass = async () => {
    const classId = Number(manageClassId);
    if (!classId) {
      pushToast({ title: "Select a class first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this class and all related subjects, chapters, and exercises?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumClass(classId);
      setManageClassId("");
      setManageClassName("");
      await refreshTree();
      pushToast({ title: "Class deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="curriculum-class-mode-tabs">
        <TabButton
          testId="curriculum-class-mode-add"
          isActive={activeClassModeTab === "add"}
          onClick={() => setActiveClassModeTab("add")}
        >
          Add
        </TabButton>
        <TabButton
          testId="curriculum-class-mode-manage"
          isActive={activeClassModeTab === "manage"}
          onClick={() => setActiveClassModeTab("manage")}
        >
          Edit / Delete
        </TabButton>
      </div>

      {activeClassModeTab === "add" ? (
        <form className="space-y-2" data-testid="curriculum-class-form" onSubmit={submitClass}>
          <p className="text-sm font-semibold text-text-primary">Add Class</p>
          <Select
            data-testid="curriculum-class-board-select"
            value={classBoardId}
            onChange={(event) => setClassBoardId(event.target.value)}
          >
            <option value="">Select board</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-class-name-input"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="Class name (e.g. 9th)"
          />
          <Button
            data-testid="curriculum-class-submit"
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
          >
            Add class
          </Button>
        </form>
      ) : (
        <div
          className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3"
          data-testid="curriculum-class-manage"
        >
          <p className="text-sm font-semibold text-text-primary">Update / Delete Class</p>
          <Select
            data-testid="curriculum-class-manage-select"
            value={manageClassId}
            onChange={(event) => setManageClassId(event.target.value)}
          >
            <option value="">Select class</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-class-manage-name-input"
            value={manageClassName}
            onChange={(event) => setManageClassName(event.target.value)}
            placeholder="Class name"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="curriculum-class-manage-update"
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={updateClass}
            >
              Update class
            </Button>
            <Button
              data-testid="curriculum-class-manage-delete"
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={deleteClass}
            >
              Delete class
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
