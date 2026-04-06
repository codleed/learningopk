import Link from "next/link";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminActionButton,
} from "@/components/admin";

interface EditSubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSubjectPage({ params }: EditSubjectPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Subjects", href: "/admin/content" },
          { label: "Edit Subject" },
        ]}
      />

      <AdminPageHeader
        title="Edit Subject"
        subtitle="Not yet available"
      />

      <div
        className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
        style={{ padding: "var(--space-6)" }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
              <svg
                className="h-5 w-5 text-[var(--text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                Edit Subject functionality is not yet available
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                The API does not support updating subjects.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Link href="/admin/content">
          <AdminActionButton variant="secondary" type="button">
            Back to Content
          </AdminActionButton>
        </Link>
      </div>
    </div>
  );
}
