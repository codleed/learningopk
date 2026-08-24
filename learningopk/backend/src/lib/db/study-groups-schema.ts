import { desc, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { chapters, quizAttempts, users } from "./schema.js";

export const studyGroupActivityTypeEnum = pgEnum("study_group_activity_type", [
  "chapter_completed",
  "quiz_score_beaten",
]);

export const studyGroups = pgTable(
  "study_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("study_groups_created_by_idx").on(table.createdBy, desc(table.createdAt))]
);

export const studyGroupMembers = pgTable(
  "study_group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("study_group_members_group_user_idx").on(table.groupId, table.userId),
    index("study_group_members_user_joined_idx").on(table.userId, desc(table.joinedAt)),
  ]
);

export const studyGroupActivities = pgTable(
  "study_group_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id").references(() => users.id, { onDelete: "cascade" }),
    activityType: studyGroupActivityTypeEnum("activity_type").notNull(),
    chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    quizAttemptId: uuid("quiz_attempt_id").references(() => quizAttempts.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("study_group_activities_group_created_idx").on(table.groupId, desc(table.createdAt)),
    index("study_group_activities_recipient_created_idx").on(
      table.recipientUserId,
      desc(table.createdAt)
    ),
  ]
);
