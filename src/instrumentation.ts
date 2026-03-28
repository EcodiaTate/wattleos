// src/instrumentation.ts
//
// Next.js 15+ instrumentation hook for server-side Sentry init.
// This file is automatically loaded by Next.js before any server code runs.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
