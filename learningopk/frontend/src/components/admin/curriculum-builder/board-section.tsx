"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createAdminCurriculumBoard,
  deleteAdminCurriculumBoard,
  updateAdminCurriculumBoard,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { useToast } from "../../ui/toast";
import { TabButton } from "./tab-button";
import type { EntityModeTab, SectionCommonProps } from "./types";
import { toSlug } from "./utils";

type BoardSectionProps = SectionCommonProps & {
  boards: AdminCurriculumBoard[];
};

export function BoardSection({
  boards,
  isSubmitting,
  setIsSubmitting,
  refreshTree,
}: BoardSectionProps) {
  const { pushToast } = useToast();
  const [activeBoardModeTab, setActiveBoardModeTab] = useState<EntityModeTab>("add");
  const [boardName, setBoardName] = useState("");
  const [manageBoardId, setManageBoardId] = useState("");
  const [manageBoardName, setManageBoardName] = useState("");

  useEffect(() => {
    const selectedBoard = boards.find((board) => board.id === Number(manageBoardId));
    setManageBoardName(selectedBoard?.name ?? "");
  }, [boards, manageBoardId]);

  const submitBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = boardName.trim();
    if (!normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumBoard({
        name: normalizedName,
        slug: toSlug(normalizedName),
      });
      setBoardName("");
      await refreshTree();
      pushToast({ title: "Board created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBoard = async () => {
    const boardId = Number(manageBoardId);
    const normalizedName = manageBoardName.trim();
    if (!boardId || !normalizedName) {
      pushToast({ title: "Select a board and provide a name", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumBoard({
        boardId,
        name: normalizedName,
        slug: toSlug(normalizedName),
      });
      await refreshTree();
      pushToast({ title: "Board updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBoard = async () => {
    const boardId = Number(manageBoardId);
    if (!boardId) {
      pushToast({ title: "Select a board first", tone: "error" });
      return;
    }
    if (
      !window.confirm(
        "Delete this board and all related classes, subjects, chapters, and exercises?"
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumBoard(boardId);
      setManageBoardId("");
      setManageBoardName("");
      await refreshTree();
      pushToast({ title: "Board deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="curriculum-board-mode-tabs">
        <TabButton
          testId="curriculum-board-mode-add"
          isActive={activeBoardModeTab === "add"}
          onClick={() => setActiveBoardModeTab("add")}
        >
          Add
        </TabButton>
        <TabButton
          testId="curriculum-board-mode-manage"
          isActive={activeBoardModeTab === "manage"}
          onClick={() => setActiveBoardModeTab("manage")}
        >
          Edit / Delete
        </TabButton>
      </div>

      {activeBoardModeTab === "add" ? (
        <form className="space-y-2" data-testid="curriculum-board-form" onSubmit={submitBoard}>
          <p className="text-sm font-semibold text-text-primary">Add Board</p>
          <Input
            data-testid="curriculum-board-name-input"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            placeholder="Board name (e.g. Punjab Board)"
          />
          <Button
            data-testid="curriculum-board-submit"
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
          >
            Add board
          </Button>
        </form>
      ) : (
        <div
          className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3"
          data-testid="curriculum-board-manage"
        >
          <p className="text-sm font-semibold text-text-primary">Update / Delete Board</p>
          <Select
            data-testid="curriculum-board-manage-select"
            value={manageBoardId}
            onChange={(event) => setManageBoardId(event.target.value)}
          >
            <option value="">Select board</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-board-manage-name-input"
            value={manageBoardName}
            onChange={(event) => setManageBoardName(event.target.value)}
            placeholder="Board name"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="curriculum-board-manage-update"
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={updateBoard}
            >
              Update board
            </Button>
            <Button
              data-testid="curriculum-board-manage-delete"
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={deleteBoard}
            >
              Delete board
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
