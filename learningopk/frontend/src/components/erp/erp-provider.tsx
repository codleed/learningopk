"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { ErpSchool } from "@/lib/erp-api";

type ErpContextValue = {
  schools: ErpSchool[];
  activeSchool: ErpSchool | null;
  setActiveSchoolId: (schoolId: number) => void;
  hasPermission: (permission: string) => boolean;
};

const ErpContext = createContext<ErpContextValue | null>(null);

export function ErpProvider({
  schools,
  initialSchoolId,
  children,
}: {
  schools: ErpSchool[];
  initialSchoolId: number | null;
  children: ReactNode;
}) {
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(initialSchoolId);

  const value = useMemo<ErpContextValue>(() => {
    const activeSchool =
      schools.find((school) => school.id === activeSchoolId) ?? schools[0] ?? null;

    return {
      schools,
      activeSchool,
      setActiveSchoolId,
      hasPermission: (permission: string) => {
        if (!activeSchool) return false;
        if (activeSchool.isAdmin || activeSchool.isOwner) return true;
        return activeSchool.permissions.includes(permission);
      },
    };
  }, [schools, activeSchoolId]);

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErp(): ErpContextValue {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error("useErp must be used within ErpProvider");
  }
  return context;
}
