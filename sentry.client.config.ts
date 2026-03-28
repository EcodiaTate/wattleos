// sentry.client.config.ts
//
// Sentry client-side configuration for WattleOS.
// Loaded automatically by @sentry/nextjs in the browser bundle.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tagging
  environment: process.env.NODE_ENV,

  // Capture all errors, sample 10% of performance transactions
  tracesSampleRate: 0.1,
  sampleRate: 1.0,

  // Privacy: do not send PII (cookies, user IP, headers) to Sentry
  sendDefaultPii: false,

  // Filter out known benign errors
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? "";

    // Next.js not-found throws are expected navigation, not real errors
    if (message.includes("NEXT_NOT_FOUND")) return null;

    // Next.js redirect throws are control flow, not errors
    if (message.includes("NEXT_REDIRECT")) return null;

    return event;
  },

  // No session replay or analytics — error tracking only
});
