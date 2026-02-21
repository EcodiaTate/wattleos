// src/app/(auth)/tenant-picker/page.tsx
//
// ============================================================
// WattleOS V2 - Tenant Picker Page
// ============================================================
// Server Component. Shown when a user belongs to multiple
// tenants and needs to choose which school to work in.
//
// WHY this page exists: Multi-tenant users (relief teachers,
// network admins) need a way to switch context. Single-tenant
// users are auto-selected via the client component so that
// the selectTenantAction server action properly refreshes
// the JWT and sets cookies.
//
// FIX APPLIED: Previously, single-tenant users were handled
// with setUserTenant() + redirect('/dashboard') directly in
// this Server Component. This CANNOT work because:
//   1. setUserTenant() updates app_metadata in the DB
//   2. But Server Components cannot set cookies during redirect
//   3. The browser's JWT cookie remains stale (no tenant_id)
//   4. Dashboard → getTenantContext() → stale JWT → redirect
//      back here → infinite 307 loop
//
// The fix: Render TenantPickerClient with autoSelect=true for
// single-tenant users. The client component calls
// selectTenantAction() on mount, which is a Server Action that
// CAN set cookies (it calls refreshSession() after updating
// app_metadata). This ensures the JWT is re-minted before
// the client navigates to /dashboard.
// ============================================================

import { getUserTenants } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TenantPickerClient } from "./tenant-picker-client";

export default async function TenantPickerPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenants = await getUserTenants(user.id);

  if (tenants.length === 0) {
    redirect("/login?error=no_school");
  }

  // Map tenant data for the client component.
  // Even single-tenant users go through the client so that
  // selectTenantAction can properly refresh the JWT cookie.
  const tenantOptions = tenants.map((t) => ({
    tenantId: t.tenant.id,
    tenantName: t.tenant.name,
    tenantSlug: t.tenant.slug,
    roleName: t.role.name,
    logoUrl: t.tenant.logo_url,
  }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-background p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {tenants.length === 1 ? "Signing you in…" : "Choose a School"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tenants.length === 1
              ? `Connecting to ${tenants[0].tenant.name}`
              : "You have access to multiple schools. Select one to continue."}
          </p>
        </div>

        <TenantPickerClient
          tenants={tenantOptions}
          autoSelect={tenants.length === 1}
        />
      </div>
    </div>
  );
}