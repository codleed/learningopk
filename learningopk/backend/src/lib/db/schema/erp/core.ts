import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { schools, users } from "../../schema.js";

// ---------------------------------------------------------------------------
// RBAC — Gauzy pattern: role + role_permission(permission, enabled) matrix +
// user-role join. Roles are school-scoped; system roles are seeded per school.
// ---------------------------------------------------------------------------

export const erpRoles = pgTable(
  "erp_roles",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_roles_school_key_idx").on(table.schoolId, table.key)]
);

export const erpRolePermissions = pgTable(
  "erp_role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => erpRoles.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [
    uniqueIndex("erp_role_permissions_role_permission_idx").on(table.roleId, table.permission),
    index("erp_role_permissions_role_idx").on(table.roleId),
  ]
);

export const erpUserRoles = pgTable(
  "erp_user_roles",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => erpRoles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_user_roles_school_user_role_idx").on(
      table.schoolId,
      table.userId,
      table.roleId
    ),
    index("erp_user_roles_school_user_idx").on(table.schoolId, table.userId),
  ]
);

// ---------------------------------------------------------------------------
// Polymorphic tags (Gauzy tags module)
// ---------------------------------------------------------------------------

export const erpTags = pgTable(
  "erp_tags",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_tags_school_name_idx").on(table.schoolId, table.name)]
);

export const erpTagLinks = pgTable(
  "erp_tag_links",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => erpTags.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_tag_links_tag_target_idx").on(table.tagId, table.targetType, table.targetId),
    index("erp_tag_links_target_idx").on(table.targetType, table.targetId, table.schoolId),
  ]
);

// ---------------------------------------------------------------------------
// Invitations (Gauzy invite module)
// ---------------------------------------------------------------------------

export const erpInvitations = pgTable(
  "erp_invitations",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    // What the invitee will become: employee | teacher | staff | custom role id
    roleId: integer("role_id").references(() => erpRoles.id, { onDelete: "set null" }),
    token: text("token").notNull().unique(),
    status: text("status").notNull().default("invited"),
    invitedBy: text("invited_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("erp_invitations_school_email_idx").on(table.schoolId, table.email)]
);
