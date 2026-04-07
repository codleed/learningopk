import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { AdminBreadcrumb } from "@/components/admin/breadcrumb";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminFormCard } from "@/components/admin/form-card";
import { AdminActionButton } from "@/components/admin/action-button";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";

export default function AddFlashCardsPage() {
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
        subtitle="Coming Soon"
      />

      <AdminFormCard>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-amber-100 p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600" aria-hidden />
          </div>
          
          <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-2">
            Flash Card Management Not Available
          </h3>
          
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            The Flash Card API is not yet available. Backend API support is needed to enable flash card creation.
          </p>

          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6 text-left">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              Required API Endpoints
            </h4>
            <ul className="space-y-1 text-xs text-amber-700">
              <li><code className="bg-amber-100 px-1 rounded">POST /api/flashcards</code> - Create flash card deck</li>
              <li><code className="bg-amber-100 px-1 rounded">GET /api/flashcards</code> - List flash card decks</li>
              <li><code className="bg-amber-100 px-1 rounded">GET /api/flashcards/:id</code> - Get flash card deck</li>
              <li><code className="bg-amber-100 px-1 rounded">PUT /api/flashcards/:id</code> - Update flash card deck</li>
              <li><code className="bg-amber-100 px-1 rounded">DELETE /api/flashcards/:id</code> - Delete flash card deck</li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/content/flashcards">
              <AdminActionButton variant="secondary" type="button">
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
                Back to Flash Cards
              </AdminActionButton>
            </Link>
          </div>
        </div>
      </AdminFormCard>

      {/* Placeholder Form UI (visual reference) */}
      <AdminFormCard title="Flash Card Form Preview">
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

          {/* Deck Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Deck Title <span className="text-red-600">*</span>
            </label>
            <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Deck title input (API needed)
            </div>
          </div>

          {/* Cards Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                Cards (0)
              </h3>
              <button
                disabled
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] cursor-not-allowed"
              >
                + Add Card
              </button>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Card editor will appear here once API is available
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              disabled
              className="inline-flex items-center rounded-md bg-[var(--bg-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] cursor-not-allowed"
            >
              Create Flash Cards
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
