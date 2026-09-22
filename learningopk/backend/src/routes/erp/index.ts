import { Router } from "express";

import { erpCoreRouter } from "./core.js";
import { erpTagsRouter } from "./tags.js";
import { erpHrmRouter } from "./hrm.js";
import { erpCrmRouter } from "./crm.js";
import { erpFinanceRouter } from "./finance.js";
import { erpAcademicsRouter } from "./academics.js";
import { erpApprovalsRouter } from "./approvals.js";
import { erpDashboardRouter } from "./dashboard.js";

export const erpRouter = Router();

erpRouter.use("/", erpCoreRouter);
erpRouter.use("/tags", erpTagsRouter);
erpRouter.use("/hrm", erpHrmRouter);
erpRouter.use("/crm", erpCrmRouter);
erpRouter.use("/finance", erpFinanceRouter);
erpRouter.use("/academics", erpAcademicsRouter);
erpRouter.use("/approvals", erpApprovalsRouter);
erpRouter.use("/dashboard", erpDashboardRouter);
