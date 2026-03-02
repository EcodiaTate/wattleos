// src/app/api/cron/ratio-breach-check/route.ts
//
// Vercel Cron Job - runs every 5 minutes
// Detects active ratio breaches and dispatches urgent
// staff announcements so leadership can act immediately.
//
// Reg 123 (Education and Care Services National Regulations):
//   Services must maintain prescribed educator:child ratios
//   at all times while children are being educated and cared for.
//
// Alert tiers:
//   initial   - breach detected (every 5 minutes)
//   escalated - breach persists > 15 minutes (adds principal urgency)
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
      "[cron/ratio-breach-check] CRON_SECRET is not set. Refusing to run.",
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
    const { checkRatioBreaches } = await import("@/lib/actions/ratios");

    const result = await checkRatioBreaches();

    if (result.error) {
      console.error(
        "[cron/ratio-breach-check] Action failed:",
        result.error.message,
      );
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 },
      );
    }

    const { tenants_checked, breached_classes, alerts_sent } = result.data!;

    console.log(
      `[cron/ratio-breach-check] Complete - ${breached_classes} breached class(es) across ${tenants_checked} tenant(s), ${alerts_sent} alert(s) sent`,
    );

    return NextResponse.json({
      success: true,
      tenants_checked,
      breached_classes,
      alerts_sent,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/ratio-breach-check] Unhandled error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
