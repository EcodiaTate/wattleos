// sentry.server.config.ts
//
// Sentry server-side configuration for WattleOS.
// Loaded automatically by @sentry/nextjs for Node.js server contexts.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tagging
  environment: process.env.NODE_ENV,

  // Capture all errors, sample 10% of performance transactions
  tracesSampleRate: 0.1,
  sampleRate: 1.0,

  // Privacy: do not send PII to Sentry
  sendDefaultPii: false,

  // Filter out known benign errors
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? "";

    if (message.includes("NEXT_NOT_FOUND")) return null;
    if (message.includes("NEXT_REDIRECT")) return null;

    return event;
  },
});
