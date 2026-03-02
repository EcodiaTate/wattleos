// src/app/api/cron/incident-escalation-check/route.ts
//
// Vercel Cron Job - runs hourly
// Alerts compliance staff when a serious incident has not been
// reported to the regulatory authority (NQA ITS) within 24 hours.
//
// Reg 87 (Education and Care Services National Regulations):
//   Services must notify the regulatory authority within 24 hours
//   of becoming aware of a serious incident.
//
// Secured by CRON_SECRET env var - set in Vercel project settings.
// Vercel passes the Authorization header automatically when invoking
// cron routes; external callers without the secret receive 401.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[cron/incident-escalation-check] CRON_SECRET is not set. Refusing to run.",
    );
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { checkIncidentNqaEscalations } =
      await import("@/lib/actions/incidents");

    const result = await checkIncidentNqaEscalations();

    if (result.error) {
      console.error(
        "[cron/incident-escalation-check] Action failed:",
        result.error.message,
      );
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 },
      );
    }

    const { tenants_checked, overdue_incidents, alerts_sent } = result.data!;

    console.log(
      `[cron/incident-escalation-check] Complete - ${overdue_incidents} overdue incident(s) across ${tenants_checked} tenant(s), ${alerts_sent} alert(s) sent`,
    );

    return NextResponse.json({
      success: true,
      tenants_checked,
      overdue_incidents,
      alerts_sent,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/incident-escalation-check] Unhandled error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
