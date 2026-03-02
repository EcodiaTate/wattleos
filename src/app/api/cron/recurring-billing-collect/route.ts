// src/app/api/cron/recurring-billing-collect/route.ts
//
// Vercel Cron Job - runs daily at 6am AEST (19:00 UTC)
// Processes recurring billing collections and payment retries:
//   1. Finds active setups with schedules due today
//   2. Creates Stripe PaymentIntents for each due collection
//   3. Retries failed payments that are scheduled for retry
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
      "[cron/recurring-billing-collect] CRON_SECRET is not set. Refusing to run.",
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
    const {
      getDueCollections,
      executeRecurringCollection,
      processScheduledRetries,
    } = await import("@/lib/actions/recurring-billing");

    // ── Step 1: Process due collections ──────────────────────
    const dueResult = await getDueCollections();
    let collectionsProcessed = 0;
    let collectionsSucceeded = 0;
    let collectionsFailed = 0;

    if (dueResult.data && dueResult.data.length > 0) {
      for (const due of dueResult.data) {
        const result = await executeRecurringCollection(
          due.setup.id,
          due.schedule.id,
          due.outstanding_invoice_id,
          due.amount_cents,
        );

        collectionsProcessed++;
        if (result.error) {
          collectionsFailed++;
          console.error(
            `[cron/recurring-billing-collect] Collection failed for setup ${due.setup.id}:`,
            result.error.message,
          );
        } else {
          collectionsSucceeded++;
        }
      }
    }

    // ── Step 2: Process scheduled retries ────────────────────
    const retryResult = await processScheduledRetries();
    const retries = retryResult.data ?? {
      processed: 0,
      succeeded: 0,
      failed: 0,
    };

    const summary = {
      success: true,
      collections: {
        due: dueResult.data?.length ?? 0,
        processed: collectionsProcessed,
        succeeded: collectionsSucceeded,
        failed: collectionsFailed,
      },
      retries,
      checked_at: new Date().toISOString(),
    };

    console.log(
      `[cron/recurring-billing-collect] Complete - ` +
        `${collectionsProcessed} collections (${collectionsSucceeded} ok, ${collectionsFailed} fail), ` +
        `${retries.processed} retries (${retries.succeeded} ok, ${retries.failed} fail)`,
    );

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/recurring-billing-collect] Unhandled error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
