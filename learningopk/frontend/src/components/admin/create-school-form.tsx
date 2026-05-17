"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check } from "lucide-react";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { createSchool } from "@/lib/school-api";
import { useToast } from "@/components/ui/toast";

export function CreateSchoolForm() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [name, setName] = useState("");
  const [board, setBoard] = useState("punjab");
  const [principalName, setPrincipalName] = useState("");
  const [principalEmail, setPrincipalEmail] = useState("");
  const [principalPassword, setPrincipalPassword] = useState("");
  const [principalClass, setPrincipalClass] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    school: { id: number; name: string; inviteCode: string };
    principal: { id: string; name: string; email: string; password: string };
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      pushToast({ title: "Error", description: "School name is required", tone: "error" });
      return;
    }
    if (!principalName.trim()) {
      pushToast({ title: "Error", description: "Principal name is required", tone: "error" });
      return;
    }
    if (!principalEmail.trim()) {
      pushToast({ title: "Error", description: "Principal email is required", tone: "error" });
      return;
    }
    if (principalPassword.length < 6) {
      pushToast({ title: "Error", description: "Password must be at least 6 characters", tone: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createSchool({
        name: name.trim(),
        board,
        principalName: principalName.trim(),
        principalEmail: principalEmail.trim(),
        principalPassword,
        principalClass,
      });

      if (!result) {
        throw new Error("Failed to create school");
      }

      setCreatedResult(result);
      pushToast({
        title: "School created",
        description: `"${name}" has been created successfully.`,
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create school",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdResult) {
    return (
      <div className="space-y-6">
        <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <AdminBreadcrumb
            segments={[
              { label: "Admin", href: "/admin" },
              { label: "Schools", href: "/admin/schools" },
              { label: "Add School" },
            ]}
          />
        </StickyBreadcrumbWrapper>

        <AdminPageHeader
          title="School Created"
          subtitle={`${createdResult.school.name} is ready. Share the credentials below with the principal.`}
        />

        <AdminFormCard>
          <div className="space-y-6">
            {/* School Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                School Details
              </h3>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Name</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{createdResult.school.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Invite Code</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-[var(--bg-base)] px-2 py-1 text-sm font-mono text-[var(--text-primary)]">
                      {createdResult.school.inviteCode}
                    </code>
                    <button
                      onClick={() => handleCopy(createdResult.school.inviteCode, "invite")}
                      className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {copiedField === "invite" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Principal Credentials */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Principal Credentials
              </h3>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Name</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{createdResult.principal.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{createdResult.principal.email}</span>
                    <button
                      onClick={() => handleCopy(createdResult.principal.email, "email")}
                      className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {copiedField === "email" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Password</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-[var(--bg-base)] px-2 py-1 text-sm font-mono text-[var(--text-primary)]">
                      {createdResult.principal.password}
                    </code>
                    <button
                      onClick={() => handleCopy(createdResult.principal.password, "password")}
                      className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {copiedField === "password" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/admin/schools">
                <AdminActionButton variant="primary" type="button">
                  Back to Schools
                </AdminActionButton>
              </Link>
              <button
                onClick={() => {
                  setCreatedResult(null);
                  setName("");
                  setPrincipalName("");
                  setPrincipalEmail("");
                  setPrincipalPassword("");
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                Create Another
              </button>
            </div>
          </div>
        </AdminFormCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Schools", href: "/admin/schools" },
            { label: "Add School" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title="Add School"
        subtitle="Create a new school and generate principal credentials."
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* School Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              School Information
            </h3>

            <AdminFormField id="school-name" label="School Name" required>
              <input
                id="school-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ibn e Sina Public High School"
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </AdminFormField>

            <AdminFormField id="school-board" label="Board" required>
              <select
                id="school-board"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="punjab">Punjab</option>
                <option value="federal">Federal</option>
                <option value="sindh">Sindh</option>
              </select>
            </AdminFormField>
          </div>

          {/* Principal Info */}
          <div className="space-y-4 pt-2 border-t border-[var(--border-default)]">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Principal Account
            </h3>

            <AdminFormField id="principal-name" label="Principal Name" required>
              <input
                id="principal-name"
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="e.g., Ahmed Khan"
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </AdminFormField>

            <AdminFormField id="principal-email" label="Principal Email" required>
              <input
                id="principal-email"
                type="email"
                value={principalEmail}
                onChange={(e) => setPrincipalEmail(e.target.value)}
                placeholder="e.g., principal@school.edu.pk"
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </AdminFormField>

            <AdminFormField id="principal-password" label="Password" required>
              <input
                id="principal-password"
                type="password"
                value={principalPassword}
                onChange={(e) => setPrincipalPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </AdminFormField>

            <AdminFormField id="principal-class" label="Class" required>
              <select
                id="principal-class"
                value={principalClass}
                onChange={(e) => setPrincipalClass(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </AdminFormField>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create School
            </AdminActionButton>
            <Link href="/admin/schools">
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
