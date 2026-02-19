// src/lib/auth/public-tenant.ts
//
// ============================================================
// WattleOS V2 - Public Tenant Resolution
// ============================================================
// Resolves tenant_id for public pages (enrollment form, invite
// acceptance, inquiry form) where there's no authenticated user.
//
// Production: tenant slug comes from subdomain via x-tenant-slug
// header set by proxy.ts.
// Dev: falls back to ?tenant= query param or NEXT_PUBLIC_DEV_TENANT_ID.
//
// WHY not getTenantContext(): That requires an authenticated user
// with a JWT containing tenant_id. Public pages have no auth.
// ============================================================

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface PublicTenantInfo {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  timezone: string;
}

/**
 * Resolve tenant for a public page. Returns null if tenant cannot be found.
 * In production, reads from x-tenant-slug header (set by proxy.ts from subdomain).
 * In development, reads from searchParams fallback or env var.
 */
export async function resolvePublicTenant(
  searchParamsTenantSlug?: string | null,
): Promise<PublicTenantInfo | null> {
  const headerList = await headers();

  // 1. Try x-tenant-slug header (set by proxy/middleware from subdomain)
  let slug = headerList.get("x-tenant-slug");

  // 2. Fallback to searchParams (dev convenience)
  if (!slug && searchParamsTenantSlug) {
    slug = searchParamsTenantSlug;
  }

  // 3. Fallback to env var (local dev)
  if (!slug) {
    const devTenantId = process.env.NEXT_PUBLIC_DEV_TENANT_ID;
    if (devTenantId) {
      // If it's a UUID, look up directly by ID
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("tenants")
        .select("id, slug, name, logo_url, timezone")
        .eq("id", devTenantId)
        .eq("is_active", true)
        .single();

      return data as PublicTenantInfo | null;
    }
    return null;
  }

  // Look up tenant by slug
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name, logo_url, timezone")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  return data as PublicTenantInfo | null;
}
