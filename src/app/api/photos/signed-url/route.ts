// src/app/api/photos/signed-url/route.ts
//
// ============================================================
// WattleOS V2 - Profile Photo Signed URL API Route
// ============================================================
// Generates short-lived (1-hour) signed URLs for accessing
// photos in the now-private profile-photos bucket.
//
// WHY an API route (not a server action):
// Server actions can't be called from client components without
// form submissions. This endpoint is called on-demand from
// image display components that need to resolve a storage_path
// to a displayable URL.
//
// WHY admin client:
// The admin (service_role) client bypasses RLS so it can
// generate signed URLs on behalf of authenticated users.
// We validate the user's session and tenant membership before
// issuing any URL.
//
// WHY 1-hour expiry:
// Short enough to limit exposure if a URL leaks; long enough
// to not require constant refreshes during a normal session.
// Matches the pattern used for observation-media and reports.
//
// BATCH support: POST body can include multiple paths to
// minimise round-trips when displaying a list of photos.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "profile-photos";
const EXPIRY_SECONDS = 3600; // 1 hour
const MAX_PATHS_PER_REQUEST = 50;

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

    // 2. Verify tenant membership (ensure user belongs to a tenant
    //    so they can only access photos associated with their school)
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership?.tenant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = membership.tenant_id;

    // 3. Parse and validate request body
    const body = await request.json();
    const paths: unknown = body.paths;

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: "paths must be a non-empty array" },
        { status: 400 },
      );
    }

    if (paths.length > MAX_PATHS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PATHS_PER_REQUEST} paths per request` },
        { status: 400 },
      );
    }

    // 4. Validate all paths belong to this tenant
    // Storage paths are: {tenantId}/{personType}/{uuid}.jpg
    const validPaths: string[] = [];
    for (const p of paths) {
      if (typeof p !== "string") continue;
      // Path must start with the authenticated user's tenant ID
      if (!p.startsWith(`${tenantId}/`)) {
        return NextResponse.json(
          { error: `Forbidden: path does not belong to your tenant: ${p}` },
          { status: 403 },
        );
      }
      validPaths.push(p);
    }

    if (validPaths.length === 0) {
      return NextResponse.json({ signed_urls: [] });
    }

    // 5. Generate signed URLs using the admin client
    const admin = createSupabaseAdminClient();

    const { data: signedUrls, error: signedError } =
      await admin.storage
        .from(BUCKET)
        .createSignedUrls(validPaths, EXPIRY_SECONDS);

    if (signedError || !signedUrls) {
      console.error("[photos/signed-url] Failed to create signed URLs:", signedError?.message);
      return NextResponse.json(
        { error: "Failed to generate signed URLs" },
        { status: 500 },
      );
    }

    // 6. Return map of storage_path -> signed_url
    const result: Record<string, string> = {};
    for (const entry of signedUrls) {
      if (entry.signedUrl && entry.path) {
        result[entry.path] = entry.signedUrl;
      }
    }

    return NextResponse.json({ signed_urls: result });
  } catch (err) {
    console.error("[photos/signed-url] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
