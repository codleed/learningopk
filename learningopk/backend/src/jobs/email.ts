import type { EmailJob, EmailJobData } from "./types.js";

import { sendEmail } from "../lib/email.js";
import { logger } from "../lib/logger.js";

export async function processEmailJob(job: EmailJob): Promise<void> {
  const data = job.data as EmailJobData;

  await job.updateProgress(10);

  switch (data.type) {
    case "weekly-digest": {
      await sendEmail({
        to: data.email,
        subject: "Your Weekly Learning Digest - LearningoPK",
        text: `Here is your weekly learning digest, ${data.data.name ?? "student"}.`,
      });
      break;
    }
    case "notification": {
      await sendEmail({
        to: data.email,
        subject: "LearningoPK Notification",
        text: String(data.data.message ?? "You have a new notification."),
      });
      break;
    }
    case "password-reset": {
      await sendEmail({
        to: data.email,
        subject: "Reset your password - LearningoPK",
        text: String(
          data.data.resetLink ?? "Use the code sent to your email to reset your password."
        ),
      });
      break;
    }
    default: {
      logger.warn({ type: data.type }, "Unknown email job type — skipping send");
    }
  }

  await job.updateProgress(100);
}
