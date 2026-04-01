"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Share2, CheckCircle2, XCircle, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuizResult } from "./quiz-runner";

type ShareableResultCardProps = {
  result: QuizResult;
  subjectName: string;
  chapterNumber?: number;
  chapterTitle?: string;
};

export function ShareableResultCard({
  result,
  subjectName,
  chapterNumber,
  chapterTitle,
}: ShareableResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isDownloadingRef = useRef(false);
  const isSharingRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", []);

  const isMockExam = result.quizType === "mock_exam";
  const passed = result.percentage >= 70;
  const formattedDate = new Date(result.completedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const displayTitle = chapterTitle || result.sectionScores?.[0]?.chapterTitle || (isMockExam ? "Mock Exam" : "Chapter Quiz");
  const displayChapterNumber = chapterNumber || result.sectionScores?.[0]?.chapterNumber;

  const correctCount = result.questionResults.filter((q) => q.isCorrect).length;
  const totalCount = result.questionResults.length;

  const handleDownload = useCallback(() => {
    if (isDownloadingRef.current) return;

    isDownloadingRef.current = true;
    setIsDownloading(true);
    try {
      const scale = 2;
      const cardWidth = 400;
      const headerHeight = 88;
      const scoreHeight = 160;
      const footerHeight = 44;
      const cardHeight = headerHeight + scoreHeight + footerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = cardWidth * scale;
      canvas.height = cardHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // ---------- Header gradient ----------
      const headerGrad = ctx.createLinearGradient(0, 0, cardWidth, headerHeight);
      if (passed) {
        headerGrad.addColorStop(0, "#6366F1");
        headerGrad.addColorStop(0.5, "#8B5CF6");
        headerGrad.addColorStop(1, "#A78BFA");
      } else {
        headerGrad.addColorStop(0, "#F59E0B");
        headerGrad.addColorStop(1, "#EF4444");
      }

      // Rounded top corners
      const radius = 16;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(cardWidth - radius, 0);
      ctx.quadraticCurveTo(cardWidth, 0, cardWidth, radius);
      ctx.lineTo(cardWidth, headerHeight);
      ctx.lineTo(0, headerHeight);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fillStyle = headerGrad;
      ctx.fill();

      // Header icon circle
      const iconCx = cardWidth - 24 - 24;
      const iconCy = headerHeight / 2;
      ctx.beginPath();
      ctx.arc(iconCx, iconCy, 24, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();

      // Icon text (trophy or X)
      ctx.fillStyle = passed ? "#FFFFFF" : "rgba(255,255,255,0.8)";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(passed ? "★" : "✕", iconCx, iconCy);

      // Header text
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const headerLabelText = isMockExam ? "MOCK EXAM" : "CHAPTER QUIZ";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "600 10px sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText(headerLabelText, 24, 20);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 17px sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText(displayTitle, 24, 36);

      if (displayChapterNumber) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Chapter ${displayChapterNumber}`, 24, 60);
      }

      // ---------- Score section (white bg) ----------
      const scoreY = headerHeight;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, scoreY, cardWidth, scoreHeight);

      // "YOUR SCORE" label
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "600 10px sans-serif";
      ctx.letterSpacing = "1px";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("YOUR SCORE", 24, scoreY + 16);

      // Percentage
      ctx.fillStyle = "#111827";
      ctx.font = "bold 36px sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText(`${result.percentage}%`, 24, scoreY + 32);

      // Score marks
      ctx.fillStyle = "#6B7280";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${result.score} out of ${result.totalMarks} marks`, 24, scoreY + 74);

      // Questions correct
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "12px sans-serif";
      ctx.fillText(`${correctCount}/${totalCount} questions correct`, 24, scoreY + 94);

      // Right side — "SUBJECT" label
      ctx.textAlign = "right";
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "600 10px sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText("SUBJECT", cardWidth - 24, scoreY + 16);

      // Subject name
      ctx.fillStyle = "#111827";
      ctx.font = "bold 17px sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText(subjectName, cardWidth - 24, scoreY + 34);

      // Date
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "12px sans-serif";
      ctx.fillText(formattedDate, cardWidth - 24, scoreY + 58);

      // Status badge (centered)
      const badgeText = passed ? "✓  Passed" : "✕  Needs Review";
      ctx.textAlign = "center";
      ctx.font = "600 13px sans-serif";

      const badgeTextWidth = ctx.measureText(badgeText).width;
      const badgePadH = 16;
      const badgePadV = 6;
      const badgeW = badgeTextWidth + badgePadH * 2;
      const badgeH = 28;
      const badgeX = (cardWidth - badgeW) / 2;
      const badgeY = scoreY + scoreHeight - badgeH - 14;

      // Badge background
      const badgeRadius = badgeH / 2;
      ctx.beginPath();
      ctx.moveTo(badgeX + badgeRadius, badgeY);
      ctx.lineTo(badgeX + badgeW - badgeRadius, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeRadius);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - badgeRadius, badgeY + badgeH);
      ctx.lineTo(badgeX + badgeRadius, badgeY + badgeH);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeRadius);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + badgeRadius, badgeY);
      ctx.closePath();
      ctx.fillStyle = passed ? "#ECFDF5" : "#FFFBEB";
      ctx.fill();

      // Badge text
      ctx.fillStyle = passed ? "#047857" : "#B45309";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, cardWidth / 2, badgeY + badgeH / 2);

      // ---------- Footer ----------
      const footerY = scoreY + scoreHeight;

      // Rounded bottom corners
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(cardWidth, footerY);
      ctx.lineTo(cardWidth, footerY + footerHeight - radius);
      ctx.quadraticCurveTo(cardWidth, footerY + footerHeight, cardWidth - radius, footerY + footerHeight);
      ctx.lineTo(radius, footerY + footerHeight);
      ctx.quadraticCurveTo(0, footerY + footerHeight, 0, footerY + footerHeight - radius);
      ctx.closePath();
      ctx.fillStyle = "#F9FAFB";
      ctx.fill();

      // Separator line at top of footer
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(cardWidth, footerY);
      ctx.strokeStyle = "#F3F4F6";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Footer branding
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("Learningo", 24, footerY + footerHeight / 2);

      ctx.textAlign = "right";
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "11px sans-serif";
      ctx.fillText("learningo.pk", cardWidth - 24, footerY + footerHeight / 2);

      // ---------- Export & download ----------
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `learningo-result-${result.attemptId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download result card:", error);
    } finally {
      isDownloadingRef.current = false;
      setIsDownloading(false);
    }
  }, [
    result.attemptId,
    result.percentage,
    result.score,
    result.totalMarks,
    passed,
    isMockExam,
    displayTitle,
    displayChapterNumber,
    subjectName,
    formattedDate,
    correctCount,
    totalCount,
  ]);

  const handleWhatsAppShare = useCallback(() => {
    if (isSharingRef.current) return;

    isSharingRef.current = true;
    setIsSharing(true);
    try {
      const scoreText = `I scored ${result.score}/${result.totalMarks} (${result.percentage}%) in ${subjectName} ${displayTitle} on Learningo!`;
      const shareUrl = `${appUrl}/learn`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${scoreText}\n\n${shareUrl}`)}`;
      window.open(whatsappUrl, "_blank");
    } catch (error) {
      console.error("Failed to share to WhatsApp:", error);
    } finally {
      isSharingRef.current = false;
      setIsSharing(false);
    }
  }, [result.score, result.totalMarks, result.percentage, subjectName, displayTitle, appUrl]);

  return (
    <div className="space-y-4">
      {/* Shareable card */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl bg-white shadow-lg"
        style={{ width: "400px" }}
      >
        {/* Header with gradient */}
        <div
          className="px-6 py-5"
          style={{
            background: passed
              ? "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)"
              : "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                {isMockExam ? "Mock Exam" : "Chapter Quiz"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">{displayTitle}</h3>
              {displayChapterNumber && (
                <p className="text-sm text-white/60">Chapter {displayChapterNumber}</p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {passed ? (
                <Trophy className="h-6 w-6 text-white" />
              ) : (
                <XCircle className="h-6 w-6 text-white/80" />
              )}
            </div>
          </div>
        </div>

        {/* Score section */}
        <div className="bg-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Your Score
              </p>
              <p className="mt-1 text-4xl font-bold text-gray-900">
                {result.percentage}%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {result.score} out of {result.totalMarks} marks
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {correctCount}/{totalCount} questions correct
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Subject
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">{subjectName}</p>
              <p className="mt-1 text-xs text-gray-400">{formattedDate}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-4 flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
                passed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {passed ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {passed ? "Passed" : "Needs Review"}
            </span>
          </div>
        </div>

        {/* Footer with branding */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-gray-400">Learningo</p>
            <p className="text-[11px] text-gray-400">learningo.pk</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleDownload}
          disabled={isDownloading}
          loading={isDownloading}
          iconLeft={!isDownloading ? <Download /> : undefined}
          className="flex-1"
        >
          {isDownloading ? "Generating..." : "Download PNG"}
        </Button>
        <Button
          type="button"
          variant="success"
          onClick={handleWhatsAppShare}
          disabled={isSharing}
          loading={isSharing}
          iconLeft={!isSharing ? <Share2 /> : undefined}
          className="flex-1"
        >
          {isSharing ? "Sharing..." : "Share on WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
