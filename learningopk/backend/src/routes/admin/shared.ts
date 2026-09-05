import { db } from "../../lib/db/index.js";
import { adminAuditLogs } from "../../lib/db/schema.js";

const adminAuditScopeValues = [
  "content",
  "forum",
  "moderation",
  "notifications",
  "settings",
  "users",
] as const;
const adminAuditStatusValues = ["success", "failed"] as const;

export type AdminAuditScope = (typeof adminAuditScopeValues)[number];
export type AdminAuditStatus = (typeof adminAuditStatusValues)[number];

export { adminAuditScopeValues, adminAuditStatusValues };

type PersistAuditLogInput = {
  scope: AdminAuditScope;
  action: string;
  target: string;
  status: "success" | "failed";
  message: string;
  actorId: string;
  actorName: string;
};

export const persistAuditLog = async (input: PersistAuditLogInput): Promise<void> => {
  await db.insert(adminAuditLogs).values({
    scope: input.scope,
    action: input.action,
    target: input.target,
    status: input.status,
    message: input.message,
    actorId: input.actorId,
    actorName: input.actorName,
  });
};
