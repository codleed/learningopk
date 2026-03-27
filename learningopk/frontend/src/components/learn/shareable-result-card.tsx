"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuizResult } from "./quiz-runner";

type ShareableResultCardProps = {
  result: QuizResult;
  subjectName: string;
  chapterNumber?: number;
  chapterTitle?: string;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function ShareableResultCard({
  result,
  subjectName,
  chapterNumber,
  chapterTitle,
}: ShareableResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isMockExam = result.quizType === "mock_exam";
  const passed = result.percentage >= 70;
  const formattedDate = new Date(result.completedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Get chapter info from section scores if not provided via props
  const displayTitle = chapterTitle || result.sectionScores?.[0]?.chapterTitle || (isMockExam ? "Mock Exam" : "Chapter Quiz");
  const displayChapterNumber = chapterNumber || result.sectionScores?.[0]?.chapterNumber;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        quality: 0.95,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `learningo-result-${result.attemptId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download result card:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [result.attemptId, isDownloading]);

  const handleWhatsAppShare = useCallback(() => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      const scoreText = `I scored ${result.score}/${result.totalMarks} (${result.percentage}%) in ${subjectName} ${displayTitle} on Learningo!`;
      const shareUrl = `${appUrl}/learn`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${scoreText}\n\n${shareUrl}`)}`;
      window.open(whatsappUrl, "_blank");
    } catch (error) {
      console.error("Failed to share to WhatsApp:", error);
    } finally {
      setIsSharing(false);
    }
  }, [result.score, result.totalMarks, result.percentage, subjectName, displayTitle, isSharing]);

  return (
    <div className="space-y-4">
      {/* Shareable Card */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl bg-white shadow-lg"
        style={{ width: "400px" }}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                {isMockExam ? "Mock Exam" : "Chapter Quiz"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">{displayTitle}</h3>
              {displayChapterNumber && (
                <p className="text-sm text-white/70">Chapter {displayChapterNumber}</p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              {passed ? (
                <CheckCircle2 className="h-7 w-7 text-white" />
              ) : (
                <XCircle className="h-7 w-7 text-white/80" />
              )}
            </div>
          </div>
        </div>

        {/* Score Section */}
        <div className="bg-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Your Score</p>
              <p className="mt-1 text-4xl font-bold text-gray-900">
                {result.percentage}%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {result.score} out of {result.totalMarks} marks
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Subject</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{subjectName}</p>
              <p className="mt-1 text-xs text-gray-400">{formattedDate}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4 flex items-center justify-center">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                passed
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {passed ? "Passed" : "Needs Review"}
            </span>
          </div>
        </div>

        {/* Footer with branding */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400">Learningo</p>
            <p className="text-xs text-gray-400">learningo.pk</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Generating..." : "Download PNG"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleWhatsAppShare}
          disabled={isSharing}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Share2 className="mr-2 h-4 w-4" />
          {isSharing ? "Sharing..." : "Share on WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
