// src/app/api/cron/medication-plan-review-check/route.ts
//
// Vercel Cron Job - runs daily at 6am AEST (19:00 UTC)
// Sends a high-priority announcement to medication admins for
// any medical management plans whose annual review is due
// within the next 7 days.
//
// Deduplicates via medication_plan_review_alerts - plans already
// alerted within the past 7 days are skipped.
//
// Secured by CRON_SECRET env var - set in Vercel project settings.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[cron/medication-plan-review-check] CRON_SECRET is not set. Refusing to run.",
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
    const { sendMedicationPlanReviewAlert } =
      await import("@/lib/actions/medication-admin");

    const result = await sendMedicationPlanReviewAlert(7);

    if (result.error) {
      console.error(
        "[cron/medication-plan-review-check] Action failed:",
        result.error.message,
      );
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 },
      );
    }

    const { plans_checked, plans_flagged, alert_sent } = result.data!;

    console.log(
      `[cron/medication-plan-review-check] Complete - ${plans_checked} checked, ${plans_flagged} flagged, alert_sent=${alert_sent}`,
    );

    return NextResponse.json({
      success: true,
      plans_checked,
      plans_flagged,
      alert_sent,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "[cron/medication-plan-review-check] Unhandled error:",
      message,
    );
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
