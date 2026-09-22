import type { ErpPermission } from "./erp.js";

/**
 * Single source of truth for the ERP permission hierarchy. Every leaf is an
 * ErpPermission string. The compile-time sync check below guarantees the
 * tree and the flat ERP_PERMISSIONS list in erp.ts stay in sync: adding a
 * permission to one without the other fails `tsc`.
 */
export const ERP_PERMISSION_HIERARCHY = {
  ERP_ACCESS: {
    CORE: {
      ROLES_VIEW: {},
      ROLES_MANAGE: {},
      TAGS_MANAGE: {},
      INVITES_MANAGE: {},
    },
    HRM: {
      EMPLOYEES_VIEW: {},
      EMPLOYEES_MANAGE: {},
      DEPARTMENTS_MANAGE: {},
      TEAMS_MANAGE: {},
      ATTENDANCE_VIEW: {},
      ATTENDANCE_MANAGE: {},
      TIME_OFF_VIEW: {},
      TIME_OFF_REQUEST: {},
      TIME_OFF_APPROVE: {},
      PAYROLL_VIEW: {},
      PAYROLL_MANAGE: {},
      EXPENSES_VIEW: {},
      EXPENSES_MANAGE: {},
    },
    CRM: {
      CONTACTS_VIEW: {},
      CONTACTS_MANAGE: {},
      PIPELINES_VIEW: {},
      PIPELINES_MANAGE: {},
      DEALS_VIEW: {},
      DEALS_MANAGE: {},
    },
    FINANCE: {
      FEES_VIEW: {},
      FEES_MANAGE: {},
      INVOICES_VIEW: {},
      INVOICES_MANAGE: {},
      PAYMENTS_VIEW: {},
      PAYMENTS_MANAGE: {},
    },
    ACADEMICS: {
      CLASSES_VIEW: {},
      CLASSES_MANAGE: {},
      ENROLLMENTS_VIEW: {},
      ENROLLMENTS_MANAGE: {},
      TIMETABLE_VIEW: {},
      TIMETABLE_MANAGE: {},
      EXAMS_VIEW: {},
      EXAMS_MANAGE: {},
      GRADES_VIEW: {},
      GRADES_MANAGE: {},
    },
    APPROVALS: {
      APPROVAL_POLICIES_VIEW: {},
      APPROVAL_POLICIES_MANAGE: {},
      APPROVALS_VIEW: {},
      APPROVALS_ACT: {},
    },
    DASHBOARD: {
      DASHBOARD_VIEW: {},
    },
  },
} as const;

/** Modules directly under the ERP_ACCESS root. */
export type ErpPermissionModule = keyof (typeof ERP_PERMISSION_HIERARCHY)["ERP_ACCESS"];

/**
 * Leaf permissions of a hierarchy node. A node whose children are all empty
 * objects (leaves) contributes its keys; deeper nodes recurse into their
 * children. Applied to the root it yields every leaf permission.
 */
type LeavesOf<T> = {
  [K in keyof T]: [keyof T[K]] extends [never] ? K : LeavesOf<T[K]>;
}[keyof T];

type HierarchyLeaf = LeavesOf<typeof ERP_PERMISSION_HIERARCHY>;

/** Flat list minus the root node: ERP_ACCESS is the tree's root, not a leaf. */
type NonRootPermission = Exclude<ErpPermission, "ERP_ACCESS">;

// Compile-time sync check: if the hierarchy drifts from ERP_PERMISSIONS
// (missing or extra leaves), this assignment fails to compile.
type _HierarchyMatchesFlatList = HierarchyLeaf extends NonRootPermission
  ? NonRootPermission extends HierarchyLeaf
    ? true
    : never
  : never;
const _hierarchySyncCheck: _HierarchyMatchesFlatList = true;
void _hierarchySyncCheck;

export type PermissionPath = readonly [module: string, leaf: ErpPermission];

const leafIndex: Map<ErpPermission, PermissionPath> = (() => {
  const index = new Map<ErpPermission, PermissionPath>();
  for (const [moduleName, leaves] of Object.entries(ERP_PERMISSION_HIERARCHY.ERP_ACCESS)) {
    for (const leaf of Object.keys(leaves)) {
      index.set(leaf as ErpPermission, [moduleName, leaf as ErpPermission]);
    }
  }
  return index;
})();

/**
 * Resolve the hierarchy path for a leaf permission.
 * Returns null for permissions outside the tree (e.g. ERP_ACCESS itself,
 * which is the root grant rather than a leaf).
 */
export function getPermissionPath(permission: ErpPermission): PermissionPath | null {
  return leafIndex.get(permission) ?? null;
}

/** All leaf permissions grouped under one module, in declaration order. */
export function getModuleLeaves(moduleName: string): ErpPermission[] {
  const leaves = ERP_PERMISSION_HIERARCHY.ERP_ACCESS[moduleName as ErpPermissionModule];
  return leaves ? (Object.keys(leaves) as ErpPermission[]) : [];
}

/** All modules directly under the ERP_ACCESS root, in declaration order. */
export function getHierarchyModules(): ErpPermissionModule[] {
  return Object.keys(ERP_PERMISSION_HIERARCHY.ERP_ACCESS) as ErpPermissionModule[];
}

/**
 * Expand a hierarchy node key (root "ERP_ACCESS", a module name like "HRM",
 * or a leaf) into the set of leaf permissions it covers. Invalidators pass
 * the node they changed and receive every cached leaf beneath it.
 */
export function expandToLeaves(node: string): Set<ErpPermission> {
  if (node === "ERP_ACCESS") {
    return new Set(leafIndex.keys());
  }
  const direct = getModuleLeaves(node);
  if (direct.length > 0) return new Set(direct);
  const asLeaf = leafIndex.get(node as ErpPermission);
  return asLeaf ? new Set([node as ErpPermission]) : new Set();
}
