// src/app/api/cron/medication-expiry-check/route.ts
//
// Vercel Cron Job - runs daily at 7am AEST (20:00 UTC)
// Sends a high-priority announcement to medication admins for
// any medical management plans expiring within 30 days.
//
// Secured by CRON_SECRET env var - set in Vercel project settings.
// Vercel automatically passes the Authorization header when
// invoking cron routes.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET must be set - silently missing config is a security hole
  if (!cronSecret) {
    console.error(
      "[cron/medication-expiry-check] CRON_SECRET is not set. Refusing to run.",
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
    // Dynamically import to avoid bundling server-only code at build time
    const { sendMedicationExpiryAlert } =
      await import("@/lib/actions/medication-admin");

    const result = await sendMedicationExpiryAlert(30);

    if (result.error) {
      console.error(
        "[cron/medication-expiry-check] Action failed:",
        result.error.message,
      );
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 },
      );
    }

    const { plans_flagged, alert_sent } = result.data!;

    console.log(
      `[cron/medication-expiry-check] Complete - ${plans_flagged} plan(s) flagged, alert_sent=${alert_sent}`,
    );

    return NextResponse.json({
      success: true,
      plans_flagged,
      alert_sent,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/medication-expiry-check] Unhandled error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
