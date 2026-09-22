"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Settings2,
  Users,
} from "lucide-react";

import { useErp } from "@/components/erp/erp-provider";
import { RadixSelect, SelectItem } from "@/components/ui/select";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      {
        href: "/school/erp",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: "DASHBOARD_VIEW",
      },
    ],
  },
  {
    title: "Academics",
    items: [
      {
        href: "/school/erp/academics/classes",
        label: "Classes",
        icon: GraduationCap,
        permission: "CLASSES_VIEW",
      },
      {
        href: "/school/erp/academics/timetable",
        label: "Timetable",
        icon: ClipboardCheck,
        permission: "TIMETABLE_VIEW",
      },
      {
        href: "/school/erp/academics/attendance",
        label: "Attendance",
        icon: Users,
        permission: "ATTENDANCE_VIEW",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        href: "/school/erp/hrm/employees",
        label: "Employees",
        icon: Users,
        permission: "EMPLOYEES_VIEW",
      },
      {
        href: "/school/erp/hrm/time-off",
        label: "Time Off",
        icon: ClipboardCheck,
        permission: "TIME_OFF_VIEW",
      },
      {
        href: "/school/erp/crm/contacts",
        label: "Contacts",
        icon: Megaphone,
        permission: "CONTACTS_VIEW",
      },
      {
        href: "/school/erp/crm/pipeline",
        label: "Admissions Pipeline",
        icon: Megaphone,
        permission: "DEALS_VIEW",
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/school/erp/finance/fees",
        label: "Fee Structures",
        icon: CreditCard,
        permission: "FEES_VIEW",
      },
      {
        href: "/school/erp/finance/invoices",
        label: "Invoices",
        icon: CreditCard,
        permission: "INVOICES_VIEW",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/school/erp/approvals",
        label: "Approvals",
        icon: ClipboardCheck,
        permission: "APPROVALS_VIEW",
      },
      {
        href: "/school/erp/roles",
        label: "Roles & Access",
        icon: Settings2,
        permission: "ROLES_VIEW",
      },
    ],
  },
];

export function ErpNav() {
  const pathname = usePathname();
  const { schools, activeSchool, setActiveSchoolId, hasPermission } = useErp();

  return (
    <aside className="flex w-full flex-col gap-4 border-b border-border bg-bg-subtle/50 p-4 lg:w-64 lg:border-b-0 lg:border-r">
      {schools.length > 1 ? (
        <div>
          <div className="mb-1.5 text-xs font-medium text-text-secondary">School</div>
          <RadixSelect
            value={String(activeSchool?.id ?? "")}
            onValueChange={(value) => setActiveSchoolId(Number(value))}
          >
            {schools.map((school) => (
              <SelectItem key={school.id} value={String(school.id)}>
                {school.name}
              </SelectItem>
            ))}
          </RadixSelect>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-1">
          <Building2 className="h-4 w-4 text-text-secondary" />
          <span className="truncate text-sm font-semibold">
            {activeSchool?.name ?? "No school"}
          </span>
        </div>
      )}

      <nav className="flex flex-col gap-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => hasPermission(item.permission));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {section.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/school/erp"
                      ? pathname === "/school/erp"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-accent-primary/10 font-medium text-accent-primary"
                          : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
