"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Flashcard = ChapterDetailResponse["flashcards"][number];
type CardStatus = "new" | "learning" | "known" | "review";

interface QuestFlashcardViewProps {
  flashcards: Flashcard[];
  statuses: Record<string, CardStatus>;
  onMarkReviewed: (cardId: string, status: CardStatus) => void;
}

const CARD_SIDE = {
  FRONT: "front",
  BACK: "back",
} as const;

export function QuestFlashcardView({
  flashcards,
  statuses,
  onMarkReviewed,
}: QuestFlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSide, setCurrentSide] = useState<typeof CARD_SIDE[keyof typeof CARD_SIDE]>(CARD_SIDE.FRONT);

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;
  
  const stats = {
    known: Object.values(statuses).filter((s) => s === "known").length,
    review: Object.values(statuses).filter((s) => s === "review").length,
    total: Object.keys(statuses).length,
  };

  const progress = totalCards > 0 ? (stats.total / totalCards) * 100 : 0;
  const isComplete = stats.total >= totalCards;

  const flipCard = () => {
    setCurrentSide(currentSide === CARD_SIDE.FRONT ? CARD_SIDE.BACK : CARD_SIDE.FRONT);
  };

  const nextCard = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentSide(CARD_SIDE.FRONT);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCurrentSide(CARD_SIDE.FRONT);
    }
  };

  const handleMark = (status: CardStatus) => {
    onMarkReviewed(String(currentCard.id), status);
    nextCard();
  };

  const getStatusBadge = (status?: CardStatus) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500/10 text-blue-600">New</Badge>;
      case "learning":
        return <Badge className="bg-amber-500/10 text-amber-600">Learning</Badge>;
      case "known":
        return <Badge className="bg-emerald-500/10 text-emerald-600">Known</Badge>;
      case "review":
        return <Badge className="bg-orange-500/10 text-orange-600">Review</Badge>;
      default:
        return null;
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No flashcards available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <span className="text-lg">🃏</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Memory Arena</p>
            <p className="font-semibold">
              {currentIndex + 1} of {totalCards}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-600">✓ {stats.known}</span>
            <span className="text-orange-600">↻ {stats.review}</span>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
        />
      </div>

      <div className="flex justify-center py-4">
        <div
          className="relative h-64 w-full max-w-md cursor-pointer perspective-1000"
          onClick={flipCard}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 rounded-2xl border-2 border-border bg-card p-6 shadow-lg"
            >
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4">{getStatusBadge(statuses[String(currentCard.id)])}</div>
                
                <p className="text-lg font-medium">
                  {currentSide === CARD_SIDE.FRONT
                    ? currentCard.front
                    : currentCard.back}
                </p>
                
                <p className="mt-4 text-sm text-muted-foreground">
                  {currentSide === CARD_SIDE.FRONT ? "Tap to reveal" : "Tap to flip back"}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {currentSide === CARD_SIDE.BACK && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-4"
        >
          <Button
            variant="secondary"
            size="lg"
            onClick={() => handleMark("review")}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Review Again
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              +5 XP
            </span>
          </Button>
          
          <Button
            size="lg"
            onClick={() => handleMark("known")}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            <CheckCircle2 className="h-4 w-4" />
            Know It!
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              +10 XP
            </span>
          </Button>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={prevCard}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex gap-1">
          {flashcards.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === currentIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        <Button
          variant="ghost"
          onClick={nextCard}
          disabled={currentIndex === totalCards - 1}
          className="gap-2"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 text-center"
        >
          <Sparkles className="h-12 w-12 text-primary" />
          <p className="text-xl font-bold">Memory Arena Complete!</p>
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
            <Sparkles className="h-5 w-5" />
            <span>+{XP_REWARDS.FLASHCARD_BONUS_ALL} XP Bonus!</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}