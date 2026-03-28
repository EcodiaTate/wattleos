// src/app/api/cron/audit-archive/route.ts
//
// ============================================================
// WattleOS V2 - Audit Log Archive Cron (Prompt 39)
// ============================================================
// Vercel Cron Job — runs daily at 02:00 AEST (16:00 UTC prev day)
//
// Finds audit_logs older than 2 years that have not yet been
// archived, exports them as NDJSON to Supabase Storage in the
// "audit-archive" bucket, then marks each row archived_at = now().
//
// Archive path structure:
//   audit-archive/{tenant_id}/{year}/{YYYY-MM-DD}.ndjson
//
// WHY NDJSON: line-delimited JSON is streamable, re-importable,
// and each line is a self-contained audit record. One file per
// tenant per day simplifies retrieval.
//
// WHY 2-year threshold: ST4S requires 7-year retention minimum.
// We move to cold storage after 2 years to keep the hot table
// fast. The purge cron deletes after the full 7-year window.
//
// Secured by CRON_SECRET env var — set in Vercel project settings.
// Vercel.json should schedule this as: "0 16 * * *" (UTC = 02:00 AEST)
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "audit-archive";
const CHUNK_SIZE = 500;
// 2 years ago
const TWO_YEARS_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/audit-archive] CRON_SECRET is not set. Refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const twoYearsAgo = new Date(Date.now() - TWO_YEARS_MS).toISOString();
  const runDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let totalArchived = 0;
  let totalErrors = 0;
  const tenantSummary: Record<string, number> = {};

  try {
    // Get all distinct tenant IDs with archive-eligible rows
    const { data: tenantRows, error: tenantError } = await admin
      .from("audit_logs")
      .select("tenant_id")
      .lt("created_at", twoYearsAgo)
      .is("archived_at", null)
      .limit(1000);

    if (tenantError) {
      console.error("[cron/audit-archive] Failed to fetch tenants:", tenantError.message);
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    const tenantIds = [...new Set((tenantRows ?? []).map((r) => r.tenant_id))];

    if (tenantIds.length === 0) {
      return NextResponse.json({ archived: 0, message: "No logs to archive" });
    }

    // Process each tenant separately so archive files are tenant-scoped
    for (const tenantId of tenantIds) {
      let offset = 0;
      let tenantArchived = 0;
      let keepFetching = true;

      while (keepFetching) {
        const { data: rows, error: fetchError } = await admin
          .from("audit_logs")
          .select("*")
          .eq("tenant_id", tenantId)
          .lt("created_at", twoYearsAgo)
          .is("archived_at", null)
          .order("created_at", { ascending: true })
          .range(offset, offset + CHUNK_SIZE - 1);

        if (fetchError) {
          console.error(
            `[cron/audit-archive] Fetch error for tenant ${tenantId}:`,
            fetchError.message,
          );
          totalErrors++;
          break;
        }

        const chunk = rows ?? [];
        if (chunk.length === 0) break;

        // Build NDJSON content
        const ndjson = chunk.map((row) => JSON.stringify(row)).join("\n");
        const content = new TextEncoder().encode(ndjson);

        // Derive archive year from first row's created_at
        const year = new Date(chunk[0].created_at).getFullYear();
        const storagePath = `${tenantId}/${year}/${runDate}_offset${offset}.ndjson`;

        // Upload to cold storage
        const { error: uploadError } = await admin.storage
          .from(BUCKET)
          .upload(storagePath, content, {
            contentType: "application/x-ndjson",
            upsert: true,
          });

        if (uploadError) {
          console.error(
            `[cron/audit-archive] Upload error at ${storagePath}:`,
            uploadError.message,
          );
          totalErrors++;
          // Continue to next chunk rather than aborting all tenants
          offset += CHUNK_SIZE;
          keepFetching = chunk.length === CHUNK_SIZE;
          continue;
        }

        // Mark rows as archived
        const archivedIds = chunk.map((r) => r.id);
        const { error: markError } = await admin
          .from("audit_logs")
          .update({ archived_at: new Date().toISOString() })
          .in("id", archivedIds);

        if (markError) {
          console.error(
            `[cron/audit-archive] Mark error for tenant ${tenantId}:`,
            markError.message,
          );
          totalErrors++;
        } else {
          tenantArchived += chunk.length;
          totalArchived += chunk.length;
        }

        if (chunk.length < CHUNK_SIZE) {
          keepFetching = false;
        } else {
          offset += CHUNK_SIZE;
        }
      }

      tenantSummary[tenantId] = tenantArchived;
    }

    console.log(
      `[cron/audit-archive] Done. Archived ${totalArchived} rows across ${tenantIds.length} tenants. Errors: ${totalErrors}.`,
    );

    return NextResponse.json({
      archived: totalArchived,
      tenants: tenantIds.length,
      errors: totalErrors,
      by_tenant: tenantSummary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/audit-archive] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
