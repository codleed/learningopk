"use client";

import Link from "next/link";
import { AlertCircle, Settings2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { ContentStatsStrip } from "@/components/admin/content-stats-strip";

type FlashCardsPageProps = {
  stats: {
    boards: number;
    classes: number;
    subjects: number;
    chapters: number;
    exercises: number;
    quizzes: number;
    flashcardDecks: number;
  };
};

export default function FlashCardsPage({ stats }: FlashCardsPageProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, chapters, exercises, quizzes, and flash cards"
      />

      <ContentStatsStrip stats={stats} />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <ContentTabs />

        <div className="p-6">
          {/* Flash Cards List - Stub State */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">
                Flash Cards
              </h2>
              <button
                disabled
                className="inline-flex items-center gap-2 rounded-md bg-[var(--muted)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] cursor-not-allowed"
                title="Flash Card API not yet available"
              >
                + Add Flash Cards
              </button>
            </div>

            {/* Stub Message Card */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-amber-100 p-3">
                  <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-heading text-base font-semibold text-amber-800">
                      Flash Card Management Coming Soon
                    </h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Flash Card management is not yet available. Backend API support is needed to enable flash card creation and management.
                    </p>
                  </div>
                  
                  <div className="rounded-md border border-amber-200 bg-amber-100/50 p-4">
                    <h4 className="text-sm font-medium text-amber-800">
                      What&apos;s Needed
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-amber-700">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Flash Card Deck CRUD API endpoints
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Individual card management within decks
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Card front/back content endpoints
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href="/admin/content"
                      className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
                    >
                      Back to Content
                    </Link>
                    <span className="text-xs text-amber-600">
                      Flash Cards are managed under Chapters
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder Table Structure (visual reference only) */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Deck Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Chapter
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Card Count
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Settings2 className="h-8 w-8 text-[var(--muted-foreground)]" aria-hidden />
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Flash Card table will appear here once API is available
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
