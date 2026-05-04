import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "__NEXTJS_DSN__",

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  includeLocalVariables: true,

  enableLogs: true,

  integrations: [
    Sentry.vercelAIIntegration({
      force: true,
      recordInputs: true,
      recordOutputs: true,
    }),
    Sentry.pinoIntegration(),
  ],
});
