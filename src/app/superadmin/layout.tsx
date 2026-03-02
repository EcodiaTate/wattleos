// src/app/(superadmin)/layout.tsx
//
// ============================================================
// WattleOS V2 - Super Admin Layout
// ============================================================
// Protects all /superadmin/* routes. Verifies the authenticated
// user has is_platform_admin = true in the users table.
//
// WHY server-side check (not middleware): The is_platform_admin
// flag is not in the JWT, intentionally. We verify against the
// DB on every layout render so revocation takes effect
// immediately without requiring a token refresh.
// ============================================================

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "WattleOS Platform Admin",
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("is_platform_admin, first_name, email")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = (userRow as { is_platform_admin: boolean } | null)
    ?.is_platform_admin;

  if (!isPlatformAdmin) {
    redirect("/dashboard");
  }

  const adminUser = userRow as {
    is_platform_admin: boolean;
    first_name: string | null;
    email: string;
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Internal ops header - intentionally distinct from school UI */}
      <header
        className="border-b"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
              style={{
                background: "var(--destructive)",
                color: "var(--destructive-foreground)",
              }}
            >
              Platform Admin
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              WattleOS Ops
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <a
              href="/superadmin/tenants"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--muted-foreground)" }}
            >
              Tenants
            </a>
            <span
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {adminUser.first_name ?? adminUser.email}
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
