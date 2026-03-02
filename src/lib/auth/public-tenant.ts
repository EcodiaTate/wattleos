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
  /** Brand hue (0-360), resolved from tenant settings with amber fallback */
  brand_hue: number;
  /** Brand saturation (0-100), resolved from tenant settings with amber fallback */
  brand_sat: number;
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
        .select("id, slug, name, logo_url, timezone, settings")
        .eq("id", devTenantId)
        .eq("is_active", true)
        .single();

      if (!data) return null;
      return resolveBrandInfo(data as Record<string, unknown>);
    }
    return null;
  }

  // Look up tenant by slug
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name, logo_url, timezone, settings")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) return null;
  return resolveBrandInfo(data as Record<string, unknown>);
}

/**
 * Extracts brand hue/sat from tenant settings with amber fallback.
 * Amber: hue=38, sat=92 (matches existing public page styling).
 */
function resolveBrandInfo(row: Record<string, unknown>): PublicTenantInfo {
  const settings = (row.settings ?? {}) as Record<string, unknown>;
  const hue = typeof settings.brand_hue === "number" ? settings.brand_hue : 38;
  const sat = typeof settings.brand_saturation === "number" ? settings.brand_saturation : 92;
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    logo_url: (row.logo_url ?? null) as string | null,
    timezone: row.timezone as string,
    brand_hue: hue,
    brand_sat: sat,
  };
}
