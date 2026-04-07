import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { AdminBreadcrumb } from "@/components/admin/breadcrumb";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminFormCard } from "@/components/admin/form-card";
import { AdminActionButton } from "@/components/admin/action-button";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";

export default function AddQuizPage() {
  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Quizzes", href: "/admin/content/quizzes" },
            { label: "Add Quiz" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title="Add Quiz"
        subtitle="Coming Soon"
      />

      <AdminFormCard>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-amber-100 p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600" aria-hidden />
          </div>
          
          <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-2">
            Quiz Management Not Available
          </h3>
          
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            The Quiz API is not yet available. Backend API support is needed to enable quiz creation.
          </p>

          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6 text-left">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              Required API Endpoints
            </h4>
            <ul className="space-y-1 text-xs text-amber-700">
              <li><code className="bg-amber-100 px-1 rounded">POST /api/quizzes</code> - Create quiz</li>
              <li><code className="bg-amber-100 px-1 rounded">GET /api/quizzes</code> - List quizzes</li>
              <li><code className="bg-amber-100 px-1 rounded">GET /api/quizzes/:id</code> - Get quiz</li>
              <li><code className="bg-amber-100 px-1 rounded">PUT /api/quizzes/:id</code> - Update quiz</li>
              <li><code className="bg-amber-100 px-1 rounded">DELETE /api/quizzes/:id</code> - Delete quiz</li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/content/quizzes">
              <AdminActionButton variant="secondary" type="button">
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
                Back to Quizzes
              </AdminActionButton>
            </Link>
          </div>
        </div>
      </AdminFormCard>

      {/* Placeholder Form UI (visual reference) */}
      <AdminFormCard title="Quiz Form Preview">
        <div className="space-y-6 opacity-50 pointer-events-none select-none">
          {/* Chapter Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Chapter <span className="text-red-600">*</span>
            </label>
            <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Chapter selection (API needed)
            </div>
          </div>

          {/* Title and Type */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Quiz Title <span className="text-red-600">*</span>
              </label>
              <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                Quiz title input (API needed)
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Type <span className="text-red-600">*</span>
              </label>
              <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                Type selection (API needed)
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Duration (minutes) <span className="text-red-600">*</span>
            </label>
            <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Duration input (API needed)
            </div>
          </div>

          {/* Questions Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                Questions (0)
              </h3>
              <button
                disabled
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] cursor-not-allowed"
              >
                + Add Question
              </button>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Question editor will appear here once API is available
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              disabled
              className="inline-flex items-center rounded-md bg-[var(--bg-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] cursor-not-allowed"
            >
              Create Quiz
            </button>
            <button
              disabled
              className="inline-flex items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </AdminFormCard>
    </div>
  );
}
