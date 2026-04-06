"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Book, FileText, Brain, ClipboardList, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ContentTab = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
};

const defaultTabs: ContentTab[] = [
  { id: "boards", label: "Boards", href: "/admin/content/boards", icon: BookOpen },
  { id: "classes", label: "Classes", href: "/admin/content/classes", icon: GraduationCap },
  { id: "subjects", label: "Subjects", href: "/admin/content/subjects", icon: Book },
  { id: "chapters", label: "Chapters", href: "/admin/content/chapters", icon: FileText },
  { id: "exercises", label: "Exercises", href: "/admin/content/exercises", icon: Brain },
  { id: "quizzes", label: "Quizzes", href: "/admin/content/quizzes", icon: ClipboardList },
  { id: "flashcards", label: "Flash Cards", href: "/admin/content/flashcards", icon: Layers },
];

type ContentTabsProps = {
  tabs?: ContentTab[];
  activeTab?: string;
  basePath?: string;
};

export function ContentTabs({ tabs = defaultTabs, activeTab, basePath = "/admin/content" }: ContentTabsProps) {
  const pathname = usePathname();
  
  // Determine active tab from URL if not provided
  const currentActiveTab = activeTab || tabs.find(tab => pathname.startsWith(tab.href))?.id || "boards";

  return (
    <div className="border-b border-[var(--border-default)]">
      <nav
        className="flex items-center gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Content types"
      >
        {tabs.map((tab) => {
          const isActive = currentActiveTab === tab.id || pathname.startsWith(tab.href);
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                border-b-2 whitespace-nowrap
                ${isActive
                  ? "border-[var(--primary)] text-[var(--text-primary)] bg-[var(--bg-subtle)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                }
              `}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`
                    ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs
                    ${isActive
                      ? "bg-[var(--primary)] text-[var(--text-primary)]"
                      : "bg-[var(--text-secondary)] text-[var(--bg-base)]"
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export { defaultTabs as contentTabsDefault };
