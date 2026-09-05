"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  getAdminChapterRevisionNotes,
  updateAdminChapterRevisionNotes,
  type AdminChapterRevisionNotes,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Props = {
  chapterId: number;
};

const EMPTY_NOTES: AdminChapterRevisionNotes = {
  keyFormulas: [],
  keyDefinitions: [],
  commonMistakes: "",
  examTips: "",
};

export function ChapterRevisionNotesManager({ chapterId }: Props) {
  const { pushToast } = useToast();
  const [notes, setNotes] = useState<AdminChapterRevisionNotes>(EMPTY_NOTES);
  const [originalNotes, setOriginalNotes] = useState<AdminChapterRevisionNotes>(EMPTY_NOTES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        const data = await getAdminChapterRevisionNotes(chapterId);
        setNotes(data.revisionNotes);
        setOriginalNotes(data.revisionNotes);
      } catch (error) {
        console.error("Failed to fetch revision notes:", error);
        setNotes(EMPTY_NOTES);
        setOriginalNotes(EMPTY_NOTES);
        pushToast({ title: "Failed to load revision notes", tone: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchNotes();
  }, [chapterId, pushToast]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(notes) !== JSON.stringify(originalNotes),
    [notes, originalNotes]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        keyFormulas: notes.keyFormulas.map((item) => item.trim()).filter(Boolean),
        keyDefinitions: notes.keyDefinitions
          .map((item) => ({ term: item.term.trim(), definition: item.definition.trim() }))
          .filter((item) => item.term && item.definition),
        commonMistakes: notes.commonMistakes,
        examTips: notes.examTips,
      } satisfies AdminChapterRevisionNotes;

      const response = await updateAdminChapterRevisionNotes({ chapterId, revisionNotes: payload });
      setNotes(response.revisionNotes);
      setOriginalNotes(response.revisionNotes);
      pushToast({ title: "Revision notes saved", tone: "success" });
    } catch (error) {
      console.error("Failed to save revision notes:", error);
      pushToast({ title: "Failed to save revision notes", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }, [chapterId, notes, pushToast]);

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Revision Notes</h2>
          <p className="text-sm text-text-secondary">
            Author short formulas, definitions, pitfalls, and exam tips for the student quick
            revision tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
          <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Revision Notes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Key formulas</h3>
            <p className="text-sm text-text-secondary">
              One formula per line or row. KaTeX syntax like \`\\frac{"{"}a{"}"}
              {"{"}b{"}"}\` is supported.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {notes.keyFormulas.map((formula, index) => (
            <div key={`formula-${index}`} className="flex gap-2">
              <Input
                value={formula}
                onChange={(event) => {
                  const next = [...notes.keyFormulas];
                  next[index] = event.target.value;
                  setNotes((current) => ({ ...current, keyFormulas: next }));
                }}
                placeholder="e.g. s = ut + \\frac{1}{2}at^2"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="square"
                onClick={() =>
                  setNotes((current) => ({
                    ...current,
                    keyFormulas: current.keyFormulas.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() =>
              setNotes((current) => ({ ...current, keyFormulas: [...current.keyFormulas, ""] }))
            }
          >
            <Plus className="h-4 w-4" />
            Add formula
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Key definitions</h3>
            <p className="text-sm text-text-secondary">
              Keep each definition concise enough for a cheat-sheet card.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {notes.keyDefinitions.map((item, index) => (
            <div
              key={`definition-${index}`}
              className="grid gap-3 rounded-xl border border-border-default p-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]"
            >
              <Input
                value={item.term}
                onChange={(event) => {
                  const next = [...notes.keyDefinitions];
                  next[index] = { ...next[index], term: event.target.value };
                  setNotes((current) => ({ ...current, keyDefinitions: next }));
                }}
                placeholder="Term"
              />
              <Input
                value={item.definition}
                onChange={(event) => {
                  const next = [...notes.keyDefinitions];
                  next[index] = { ...next[index], definition: event.target.value };
                  setNotes((current) => ({ ...current, keyDefinitions: next }));
                }}
                placeholder="Definition"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="square"
                onClick={() =>
                  setNotes((current) => ({
                    ...current,
                    keyDefinitions: current.keyDefinitions.filter(
                      (_, itemIndex) => itemIndex !== index
                    ),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() =>
              setNotes((current) => ({
                ...current,
                keyDefinitions: [...current.keyDefinitions, { term: "", definition: "" }],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add definition
          </Button>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Common mistakes</h3>
              <p className="text-sm text-text-secondary">Use one line per warning badge.</p>
            </div>
          </CardHeader>
          <CardBody>
            <Textarea
              value={notes.commonMistakes}
              onChange={(event) =>
                setNotes((current) => ({ ...current, commonMistakes: event.target.value }))
              }
              rows={8}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Exam tips</h3>
              <p className="text-sm text-text-secondary">Keep this crisp and printable.</p>
            </div>
          </CardHeader>
          <CardBody>
            <Textarea
              value={notes.examTips}
              onChange={(event) =>
                setNotes((current) => ({ ...current, examTips: event.target.value }))
              }
              rows={8}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
