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
// users are auto-selected here and never see the UI.
//
// FIXES APPLIED:
// 1. Import: createClient → createSupabaseServerClient
//    (createClient doesn't exist in server.ts)
// 2. Single-tenant loop: now calls setUserTenant() BEFORE
//    redirecting to /dashboard, so the JWT has a tenant_id
//    when getTenantContext() runs on the dashboard page.
// ============================================================

import { getUserTenants, setUserTenant } from "@/lib/auth/tenant-context";
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

  if (tenants.length === 1) {
    // Write the tenant_id into the JWT BEFORE redirecting.
    // Without this, /dashboard → getTenantContext() → no tenant_id
    // → redirect back to /tenant-picker → infinite 307 loop.
    await setUserTenant(user.id, tenants[0].tenant.id);
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-background p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Choose a School
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You have access to multiple schools. Select one to continue.
          </p>
        </div>

        <TenantPickerClient
          tenants={tenants.map((t) => ({
            tenantId: t.tenant.id,
            tenantName: t.tenant.name,
            tenantSlug: t.tenant.slug,
            roleName: t.role.name,
            logoUrl: t.tenant.logo_url,
          }))}
        />
      </div>
    </div>
  );
}
