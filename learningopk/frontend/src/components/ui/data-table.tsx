import type { HTMLAttributes, TableHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface DataTableProps extends HTMLAttributes<HTMLDivElement> {
  tableClassName?: string;
  tableProps?: TableHTMLAttributes<HTMLTableElement>;
}

export function DataTable({ className, tableClassName, tableProps, children, ...props }: DataTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", className)} {...props}>
      <table
        {...tableProps}
        className={cn("min-w-full divide-y divide-border-default text-sm", tableClassName, tableProps?.className)}
      >
        {children}
      </table>
    </div>
  );
}

export function DataTableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-bg-subtle", className)} {...props} />;
}

export function DataTableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border-default", className)} {...props} />;
}

export function DataTableHead({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-3 py-2 text-left font-semibold text-text-primary", className)} {...props} />;
}

export function DataTableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2 text-text-primary", className)} {...props} />;
}
