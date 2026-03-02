// src/app/api/ask-wattle/revert/route.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Revert Endpoint
// ============================================================
// Reverses write operations performed by Ask Wattle tools.
//
// Security:
//   - Authenticates the user via Supabase session cookies
//   - Re-validates permissions for each revert action
//   - Enforces a 10-minute staleness window (can't revert old actions)
//   - Logs the revert to audit_logs for compliance
//
// WHY explicit reverts (not generic undo): Each revert handler
// knows exactly what to undo and validates permissions. This is
// safer than a generic "undo last action" pattern.
// ============================================================

import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RevertDescriptor } from "@/types/ask-wattle";
import type { AttendanceStatus } from "@/types/domain";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Max time (ms) after which a revert is rejected as stale */
const REVERT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the revert descriptor
    const body = (await request.json()) as RevertDescriptor;

    if (!body.revert_action || !body.args || !body.performed_at) {
      return NextResponse.json(
        { error: "Invalid revert request" },
        { status: 400 },
      );
    }

    // 3. Check staleness
    const performedAt = new Date(body.performed_at).getTime();
    const now = Date.now();
    if (now - performedAt > REVERT_WINDOW_MS) {
      return NextResponse.json(
        {
          error:
            "This action can no longer be undone (expired after 10 minutes)",
        },
        { status: 410 },
      );
    }

    // 4. Resolve permissions
    let tenantId: string | null = null;
    let permissions: string[] = [];

    const { data: membership } = await supabase
      .from("tenant_users")
      .select("tenant_id, role_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    tenantId = membership?.tenant_id ?? null;

    if (membership?.role_id && tenantId) {
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("permission:permissions(key)")
        .eq("tenant_id", tenantId)
        .eq("role_id", membership.role_id);

      permissions = (
        (rolePerms ?? []) as {
          permission: { key: string } | { key: string }[] | null;
        }[]
      )
        .map((rp) => {
          const perm = rp.permission;
          if (!perm) return null;
          if (Array.isArray(perm)) return perm[0]?.key ?? null;
          return perm.key ?? null;
        })
        .filter((key): key is string => !!key);
    }

    // 5. Dispatch to revert handler
    const { revert_action, args } = body;

    switch (revert_action) {
      case "delete_attendance": {
        // Permission check
        if (!permissions.includes(Permissions.MANAGE_ATTENDANCE)) {
          return NextResponse.json(
            { error: "You don't have permission to undo this action" },
            { status: 403 },
          );
        }

        const recordId = args.record_id as string;
        const studentId = args.student_id as string;
        if (!recordId || !studentId) {
          return NextResponse.json(
            { error: "Missing record information for revert" },
            { status: 400 },
          );
        }

        // Soft-delete the attendance record
        const { error: deleteError } = await supabase
          .from("attendance_records")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", recordId);

        if (deleteError) {
          return NextResponse.json(
            { error: `Failed to undo: ${deleteError.message}` },
            { status: 500 },
          );
        }

        // Audit log
        await logRevertAudit(supabase, tenantId, user.id, revert_action, args);

        return NextResponse.json({ success: true });
      }

      case "restore_attendance_status": {
        // Permission check
        if (!permissions.includes(Permissions.MANAGE_ATTENDANCE)) {
          return NextResponse.json(
            { error: "You don't have permission to undo this action" },
            { status: 403 },
          );
        }

        const recordId = args.record_id as string;
        const previousStatus = args.previous_status as AttendanceStatus;
        if (!recordId || !previousStatus) {
          return NextResponse.json(
            { error: "Missing record information for revert" },
            { status: 400 },
          );
        }

        // Restore the previous status
        const { error: updateError } = await supabase
          .from("attendance_records")
          .update({ status: previousStatus })
          .eq("id", recordId);

        if (updateError) {
          return NextResponse.json(
            { error: `Failed to undo: ${updateError.message}` },
            { status: 500 },
          );
        }

        // Audit log
        await logRevertAudit(supabase, tenantId, user.id, revert_action, args);

        return NextResponse.json({ success: true });
      }

      case "revert_bulk_attendance": {
        if (!permissions.includes(Permissions.MANAGE_ATTENDANCE)) {
          return NextResponse.json(
            { error: "You don't have permission to undo this action" },
            { status: 403 },
          );
        }

        const recordIds = args.record_ids as string[];
        const previousStatuses = args.previous_statuses as Record<
          string,
          string | null
        >;
        if (!recordIds || !previousStatuses) {
          return NextResponse.json(
            { error: "Missing record information for revert" },
            { status: 400 },
          );
        }

        // Revert each record to its previous state
        for (const recordId of recordIds) {
          const prev = previousStatuses[recordId];
          if (prev === null || prev === undefined) {
            // No previous record - soft-delete
            await supabase
              .from("attendance_records")
              .update({ deleted_at: new Date().toISOString() })
              .eq("id", recordId);
          } else {
            // Restore previous status
            await supabase
              .from("attendance_records")
              .update({ status: prev })
              .eq("id", recordId);
          }
        }

        await logRevertAudit(supabase, tenantId, user.id, revert_action, args);
        return NextResponse.json({ success: true });
      }

      case "revert_checkin": {
        if (!permissions.includes(Permissions.CHECKIN_CHECKOUT)) {
          return NextResponse.json(
            { error: "You don't have permission to undo this action" },
            { status: 403 },
          );
        }

        const bookingId = args.booking_id as string;
        if (!bookingId) {
          return NextResponse.json(
            { error: "Missing booking information for revert" },
            { status: 400 },
          );
        }

        const { error } = await supabase
          .from("session_bookings")
          .update({ checked_in_at: null })
          .eq("id", bookingId);

        if (error) {
          return NextResponse.json(
            { error: `Failed to undo: ${error.message}` },
            { status: 500 },
          );
        }

        await logRevertAudit(supabase, tenantId, user.id, revert_action, args);
        return NextResponse.json({ success: true });
      }

      case "revert_checkout": {
        if (!permissions.includes(Permissions.CHECKIN_CHECKOUT)) {
          return NextResponse.json(
            { error: "You don't have permission to undo this action" },
            { status: 403 },
          );
        }

        const bookingId = args.booking_id as string;
        if (!bookingId) {
          return NextResponse.json(
            { error: "Missing booking information for revert" },
            { status: 400 },
          );
        }

        const { error } = await supabase
          .from("session_bookings")
          .update({ checked_out_at: null })
          .eq("id", bookingId);

        if (error) {
          return NextResponse.json(
            { error: `Failed to undo: ${error.message}` },
            { status: 500 },
          );
        }

        await logRevertAudit(supabase, tenantId, user.id, revert_action, args);
        return NextResponse.json({ success: true });
      }

      case "revert_time_entry": {
        if (!permissions.includes(Permissions.LOG_TIME)) {
          return NextResponse.json(
            { error: "You don't have permission to undo this action" },
            { status: 403 },
          );
        }

        const entryId = args.entry_id as string;
        if (!entryId) {
          return NextResponse.json(
            { error: "Missing entry information for revert" },
            { status: 400 },
          );
        }

        const { error } = await supabase
          .from("time_entries")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entryId);

        if (error) {
          return NextResponse.json(
            { error: `Failed to undo: ${error.message}` },
            { status: 500 },
          );
        }

        await logRevertAudit(supabase, tenantId, user.id, revert_action, args);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown revert action: ${revert_action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[api/ask-wattle/revert] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// Audit Logging
// ============================================================

type AuditSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

async function logRevertAudit(
  supabase: AuditSupabaseClient,
  tenantId: string | null,
  userId: string,
  revertAction: string,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: userId,
      action: `ask_wattle.revert.${revertAction}`,
      entity_type: "ask_wattle_revert",
      entity_id:
        (args.record_id as string) ??
        (args.entry_id as string) ??
        (args.booking_id as string) ??
        null,
      metadata: {
        source: "ask_wattle",
        revert_action: revertAction,
        args,
      },
    });
  } catch {
    // Non-critical - don't fail the revert if audit logging fails
    console.error("[ask-wattle/revert] Failed to write audit log");
  }
}
