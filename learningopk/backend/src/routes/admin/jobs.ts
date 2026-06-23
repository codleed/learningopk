import { Router } from "express";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { requireAdminRole } from "../../lib/admin.js";
import { getAllQueues, jobRegistry } from "../../lib/queue.js";

export const jobsAdminRouter = Router();

jobsAdminRouter.get("/jobs/stats", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const stats = await Promise.all(
    jobRegistry.map(async (def) => {
      const queue = def.getQueue();
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      return {
        name: def.name,
        queue: queue.name,
        counts: { waiting, active, completed, failed },
      };
    })
  );
  res.json({ jobs: stats });
});

jobsAdminRouter.post("/jobs/:queueName/:jobId/retry", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const { queueName, jobId } = req.params;

  if (Array.isArray(jobId) || !jobId) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const queue = getAllQueues().find((q) => q.name === queueName);

  if (!queue) {
    res.status(404).json({ error: "Queue not found" });
    return;
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await job.retry();
  res.json({ success: true, jobId });
});
