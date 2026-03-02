// src/app/api/ask-wattle/route.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Streaming API Route
// ============================================================
// Server-Sent Events (SSE) endpoint for streaming chat responses.
//
// WHY SSE instead of WebSockets: SSE is simpler (unidirectional),
// works through all CDNs/proxies, auto-reconnects, and is all we
// need - the user sends a message (POST), Wattle streams back.
// No bidirectional communication required.
//
// WHY an API route instead of a Server Action: Server Actions
// can't stream. Next.js API routes with ReadableStream can.
// The Server Action version (askWattle) exists for non-streaming
// use cases like programmatic access or testing.
//
// Auth: Reads the Supabase session from cookies. No API key
// needed - this is an internal endpoint for authenticated users.
// ============================================================

import { buildAskWattleStream } from "@/lib/docs/ask-wattle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import type { AskWattleRequest } from "@/types/ask-wattle";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // 2. Rate limit per user ID - prevents a rogue authenticated user from
    // running up unbounded LLM API costs. Keyed on user.id so that
    // shared IPs (schools on NAT) don't interfere with each other.
    const rl = await checkRateLimit("authenticated_llm", user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }

    // 3. Parse request body
    const body = (await request.json()) as AskWattleRequest;

    if (
      !body.message ||
      typeof body.message !== "string" ||
      body.message.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Sanitize input
    const sanitizedInput: AskWattleRequest = {
      message: body.message.trim().slice(0, 2000), // Cap at 2000 chars
      conversation_id: body.conversation_id ?? undefined,
      current_route: body.current_route ?? undefined,
      user_role: body.user_role ?? undefined,
      user_name: body.user_name ?? undefined,
      tenant_name: body.tenant_name ?? undefined,
      // UI manifest for glow guidance - cap at 4000 chars to prevent abuse
      ui_manifest: body.ui_manifest?.slice(0, 4000) ?? undefined,
    };

    // 4. Resolve tenant and permissions (server-authoritative)
    // WHY resolve permissions server-side: Never trust client-sent
    // permissions as the authority. The client sends them as hints
    // for the prompt, but we validate against the real DB here.
    let tenantId: string | null = null;
    let permissions: string[] = [];
    try {
      const { data: membership } = await supabase
        .from("tenant_users")
        .select("tenant_id, role_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      tenantId = membership?.tenant_id ?? null;

      // Resolve the user's actual permissions from their role.
      // Uses the same join pattern as getTenantContext() —
      // role_permissions has permission_id (FK), not permission_key.
      if (membership?.role_id && tenantId) {
        const { data: rolePerms } = await supabase
          .from("role_permissions")
          .select(
            `
            permission:permissions(key)
          `,
          )
          .eq("tenant_id", tenantId)
          .eq("role_id", membership.role_id);

        // Supabase nested selects can return { key } or [{ key }]
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
    } catch {
      // Non-tenant user (e.g., demo accounts) - no permissions
      tenantId = null;
      permissions = [];
    }

    // 5. Build and return the stream with permissions
    const { stream } = await buildAskWattleStream(
      sanitizedInput,
      user.id,
      tenantId,
      permissions,
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (err) {
    // SECURITY: Log internally but never expose raw error details to clients.
    // err.message can contain file paths, query fragments, or other internals.
    console.error(
      "[api/ask-wattle] Error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
