// src/app/api/cron/audit-purge/route.ts
//
// ============================================================
// WattleOS V2 - Audit Log Purge Cron (Prompt 39)
// ============================================================
// Vercel Cron Job — runs daily at 03:00 AEST (17:00 UTC prev day)
//
// Finds archived audit_logs where retain_until < today and
// hard-deletes them. These rows have already been:
//   (a) archived to cold storage by the audit-archive cron, AND
//   (b) held for the full 7-year retention window
//
// WHY only archived rows:
//   We never hard-delete unarchived rows within this job.
//   A row must pass through the archive step first, which
//   validates that the cold storage copy exists. This is a
//   safety guarantee against accidental data loss.
//
// WHY hard-delete after retain_until:
//   The Privacy Act (APP 11.2) requires that personal information
//   is destroyed or de-identified when no longer needed.
//   After 7 years the audit trail obligation ends.
//
// Secured by CRON_SECRET env var — set in Vercel project settings.
// Vercel.json should schedule this as: "0 17 * * *" (UTC = 03:00 AEST)
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PURGE_BATCH_SIZE = 1000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/audit-purge] CRON_SECRET is not set. Refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let totalPurged = 0;
  let totalErrors = 0;

  try {
    // Paginate the delete in batches to avoid timeout on large sets
    let keepPurging = true;
    while (keepPurging) {
      // Find IDs of eligible rows (archived AND past retain_until)
      const { data: eligible, error: selectError } = await admin
        .from("audit_logs")
        .select("id")
        .not("archived_at", "is", null) // Must be archived first
        .lt("retain_until", today)       // Past the 7-year window
        .limit(PURGE_BATCH_SIZE);

      if (selectError) {
        console.error("[cron/audit-purge] Select error:", selectError.message);
        totalErrors++;
        break;
      }

      const ids = (eligible ?? []).map((r) => r.id);

      if (ids.length === 0) {
        keepPurging = false;
        break;
      }

      // Hard-delete the batch
      const { error: deleteError } = await admin
        .from("audit_logs")
        .delete()
        .in("id", ids);

      if (deleteError) {
        console.error("[cron/audit-purge] Delete error:", deleteError.message);
        totalErrors++;
        break;
      }

      totalPurged += ids.length;

      if (ids.length < PURGE_BATCH_SIZE) {
        keepPurging = false;
      }
    }

    console.log(
      `[cron/audit-purge] Done. Purged ${totalPurged} rows. Errors: ${totalErrors}.`,
    );

    return NextResponse.json({
      purged: totalPurged,
      errors: totalErrors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/audit-purge] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
