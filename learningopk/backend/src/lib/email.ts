import { Resend } from "resend";

import { env } from "./env.js";
import { logger } from "./logger.js";

const resend = env.RESEND_API_KEY !== "not-configured"
  ? new Resend(env.RESEND_API_KEY)
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!resend) {
    logger.warn({ to: params.to, subject: params.subject }, "Email not sent — RESEND_API_KEY not configured");
    return;
  }

  try {
    const { to, subject, text, html } = params;
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });

    if (result.error) {
      logger.error({ error: result.error, to: params.to }, "Resend send failed");
    }
  } catch (err) {
    logger.error({ error: err, to: params.to }, "Email send exception");
  }
}
