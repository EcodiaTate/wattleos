// src/app/api/webhooks/auth/route.ts
//
// ============================================================
// WattleOS V2 - Supabase Auth Webhook Handler
// ============================================================
// Receives auth events from Supabase (configure in Supabase
// Dashboard → Auth → Hooks → "Send Auth Events" webhook).
//
// Tracks failed login attempts and triggers lockout after
// 10 failures from the same email within 15 minutes.
//
// Secured by AUTH_WEBHOOK_SECRET env var (configured in
// Supabase Dashboard as the webhook secret).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logAuditSystem } from "@/lib/utils/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_WINDOW_MINUTES = 15;
const LOCKOUT_DURATION = "15m";

// Supabase Auth event payload shape (subset of fields we care about)
interface AuthWebhookPayload {
  event:
    | "LOGIN"
    | "SIGNUP"
    | "TOKEN_REFRESHED"
    | "USER_UPDATED"
    | "USER_DELETED"
    | string;
  user?: {
    id?: string;
    email?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  // Some auth hook formats include these at root
  email?: string;
  error?: string;
  outcome?: "success" | "failure";
}

export async function POST(request: NextRequest) {
  // ── Validate webhook secret ──
  const webhookSecret = process.env.AUTH_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhooks/auth] AUTH_WEBHOOK_SECRET is not set.");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse payload ──
  let payload: AuthWebhookPayload;
  try {
    payload = (await request.json()) as AuthWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ip = request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const email = payload.user?.email ?? payload.email ?? "unknown";

  // ── Only process failed login events ──
  // Supabase Auth hooks can send events in different formats depending
  // on config. We look for explicit failure indicators.
  const isFailure =
    payload.outcome === "failure" ||
    (payload.event === "LOGIN" && payload.error != null);

  if (!isFailure) {
    // Not a failed login — acknowledge and return
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    // ── Record the failed attempt ──
    await supabase.from("auth_failed_logins").insert({
      email,
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        event: payload.event,
        error: payload.error ?? null,
        user_id: payload.user?.id ?? null,
      },
    });

    // ── Log to audit trail ──
    // Use a system tenant ID placeholder since we don't know which tenant
    // the failed login belongs to (could be any or none)
    const SYSTEM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

    // Try to resolve the user's tenant for better audit trail
    let tenantId = SYSTEM_TENANT_ID;
    if (payload.user?.id) {
      const { data: membership } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", payload.user.id)
        .is("deleted_at", null)
        .limit(1)
        .single();
      if (membership?.tenant_id) {
        tenantId = membership.tenant_id;
      }
    }

    await logAuditSystem({
      tenantId,
      action: "auth.login_failed",
      entityType: "auth",
      metadata: {
        email,
        ip_address: ip,
        user_agent: userAgent,
        error: payload.error ?? null,
      },
    });

    // ── Check lockout threshold ──
    const windowStart = new Date(
      Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();

    const { count } = await supabase
      .from("auth_failed_logins")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("attempted_at", windowStart);

    if (count != null && count >= LOCKOUT_THRESHOLD) {
      // ── Trigger lockout ──
      // Find the user by email and temporarily ban them
      const { data: users } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // listUsers doesn't support email filter, so look up via the users table
      const { data: userRecord } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userRecord?.id) {
        await supabase.auth.admin.updateUserById(userRecord.id, {
          ban_duration: LOCKOUT_DURATION,
        });

        // Suppress unused variable warning for users check
        void users;

        await logAuditSystem({
          tenantId,
          action: "auth.account_locked",
          entityType: "auth",
          metadata: {
            email,
            ip_address: ip,
            failed_attempts: count,
            lockout_duration: LOCKOUT_DURATION,
            reason: `${LOCKOUT_THRESHOLD} failed login attempts within ${LOCKOUT_WINDOW_MINUTES} minutes`,
          },
        });

        console.warn(
          `[webhooks/auth] Account locked: ${email} — ${count} failed attempts from IP ${ip}`,
        );
      }
    }
  } catch (err) {
    console.error("[webhooks/auth] Error processing failed login:", err);
    // Still return 200 to prevent Supabase from retrying
    return NextResponse.json(
      { received: true, warning: "Processing error logged" },
      { status: 200 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
