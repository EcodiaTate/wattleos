// src/lib/utils/resolve-public-tenant.ts
//
// ============================================================
// WattleOS V2 - Public Tenant Resolution
// ============================================================
// Resolves tenant_id from the subdomain slug for public-facing
// pages (inquiry form, tour booking, status checker).
//
// WHY a shared helper: All public pages need the same logic  - 
// read the x-tenant-slug header set by proxy.ts, look up the
// tenant in the database, return { id, name, slug }. Extracted
// here so we don't duplicate the Supabase query in 3+ pages.
//
// Returns null if the slug is missing or the tenant doesn't
// exist. The calling page should show a "school not found"
// message in that case.
// ============================================================

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
}

export async function resolvePublicTenant(): Promise<PublicTenant | null> {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  return data as PublicTenant;
}
