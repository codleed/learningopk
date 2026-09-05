"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Select } from "@/components/ui/select";
import type { AdminCurriculumBoard } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

interface AddFlashCardFormProps {
  boards: AdminCurriculumBoard[];
  preSelectedChapterId?: number;
}

interface ChapterOption {
  id: number;
  label: string;
}

interface FlashCard {
  id: string;
  front: string;
  back: string;
}

export function AddFlashCardForm({ boards, preSelectedChapterId }: AddFlashCardFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const searchParams = useSearchParams();

  // Flatten boards > classes > subjects > chapters for chapter options
  const chapterOptions: ChapterOption[] = boards.flatMap((board) =>
    board.classes.flatMap((boardClass) =>
      boardClass.subjects.flatMap((subject) =>
        subject.chapters.map((chapter) => ({
          id: chapter.id,
          label: `${board.name} / ${boardClass.name} / ${subject.name} / Chapter ${chapter.chapterNumber}: ${chapter.title}`,
        }))
      )
    )
  );

  const [chapterId, setChapterId] = useState<string>(
    preSelectedChapterId?.toString() || searchParams.get("chapterId") || ""
  );
  const [deckTitle, setDeckTitle] = useState<string>("");
  const [cards, setCards] = useState<FlashCard[]>([
    { id: "1", front: "", back: "" },
    { id: "2", front: "", back: "" },
  ]);

  // Errors
  const [chapterError, setChapterError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  const [cardsError, setCardsError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCard = () => {
    setCards([
      ...cards,
      {
        id: Date.now().toString(),
        front: "",
        back: "",
      },
    ]);
  };

  const removeCard = (id: string) => {
    if (cards.length > 1) {
      setCards(cards.filter((c) => c.id !== id));
    }
  };

  const updateCard = (id: string, field: keyof FlashCard, value: string) => {
    setCards(cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const validateForm = (): boolean => {
    let hasError = false;

    if (!chapterId) {
      setChapterError("Chapter is required");
      hasError = true;
    }

    if (!deckTitle.trim()) {
      setTitleError("Deck title is required");
      hasError = true;
    }

    for (const card of cards) {
      if (!card.front.trim() || !card.back.trim()) {
        setCardsError("All cards must have both front and back text");
        hasError = true;
        break;
      }
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Call API to create flash card deck
      console.log("Creating flash card deck:", {
        chapterId: parseInt(chapterId, 10),
        title: deckTitle.trim(),
        cards,
      });

      pushToast({
        title: "Flash Cards created",
        description: `"${deckTitle}" with ${cards.length} cards has been created successfully.`,
        tone: "success",
      });

      router.push("/admin/content/flashcards");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create flash cards",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Flash Cards", href: "/admin/content/flashcards" },
            { label: "Add Flash Cards" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title="Add Flash Cards"
        subtitle="Create a new flash card deck under a chapter"
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField id="flashcard-chapter" label="Chapter" required error={chapterError}>
            <Select
              id="flashcard-chapter"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setChapterError("");
              }}
              aria-invalid={!!chapterError}
            >
              <option value="">Select a chapter</option>
              {chapterOptions.map((option) => (
                <option key={option.id} value={option.id.toString()}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          <AdminFormField
            id="flashcard-title"
            label="Deck Title"
            required
            error={titleError}
            hint="e.g., Algebra Formulas, Physics Terms"
          >
            <input
              id="flashcard-title"
              type="text"
              value={deckTitle}
              onChange={(e) => {
                setDeckTitle(e.target.value);
                setTitleError("");
              }}
              placeholder="e.g., Algebra Formulas"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                Cards ({cards.length})
              </h3>
              <button
                type="button"
                onClick={addCard}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add Card
              </button>
            </div>

            {cardsError && <p className="text-sm text-red-600">{cardsError}</p>}

            <div className="space-y-4">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-medium text-[var(--text-primary)]">Card {index + 1}</h4>
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCard(card.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <AdminFormField
                      id={`card-front-${card.id}`}
                      label="Front (Question/Term)"
                      required
                    >
                      <textarea
                        id={`card-front-${card.id}`}
                        value={card.front}
                        onChange={(e) => updateCard(card.id, "front", e.target.value)}
                        placeholder="Enter the question or term..."
                        rows={3}
                        className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                    </AdminFormField>

                    <AdminFormField
                      id={`card-back-${card.id}`}
                      label="Back (Answer/Definition)"
                      required
                    >
                      <textarea
                        id={`card-back-${card.id}`}
                        value={card.back}
                        onChange={(e) => updateCard(card.id, "back", e.target.value)}
                        placeholder="Enter the answer or definition..."
                        rows={3}
                        className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                    </AdminFormField>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Flash Cards
            </AdminActionButton>
            <Link href="/admin/content/flashcards">
              <AdminActionButton variant="secondary" type="button">
                Cancel
              </AdminActionButton>
            </Link>
          </div>
        </form>
      </AdminFormCard>
    </div>
  );
}
