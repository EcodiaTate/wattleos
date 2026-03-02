// src/app/(app)/admin/settings/payroll/employees/page.tsx
//
// ============================================================
// WattleOS V2 - Employee Mapping Page
// ============================================================
// Links WattleOS user accounts to external payroll IDs
// (Xero employee IDs, KeyPay employee numbers, etc.).
//
// WHY server component: all data fetching happens here;
// the client component handles add/edit/deactivate mutations.
// ============================================================

import { EmployeeMappingClient } from "@/components/domain/timesheets/employee-mapping-client";
import {
  getPayrollSettings,
  listEmployeeMappings,
} from "@/lib/actions/payroll-integration";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PayrollProvider } from "@/types/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Employee Mapping - WattleOS" };

export default async function EmployeeMappingPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_INTEGRATIONS)) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();

  // Fetch all three in parallel
  const [mappingsResult, settingsResult, { data: membersData }] =
    await Promise.all([
      listEmployeeMappings(),
      getPayrollSettings(),
      supabase
        .from("tenant_users")
        .select("user_id, users(id, first_name, last_name, email)")
        .eq("tenant_id", context.tenant.id)
        .eq("status", "active"),
    ]);

  const mappings = mappingsResult.data ?? [];
  const provider: PayrollProvider | null =
    settingsResult.data?.payroll_provider ?? null;

  // Flatten tenant_users join to the flat shape EmployeeMappingClient expects
  const staff = ((membersData ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const user = Array.isArray(row.users)
        ? (row.users[0] as {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string;
          } | undefined)
        : (row.users as {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string;
          } | null);
      if (!user) return null;
      return {
        id: user.id,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email,
      };
    })
    .filter((m): m is { id: string; first_name: string; last_name: string; email: string } => m !== null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/settings/payroll" className="hover:text-foreground">
            Payroll Settings
          </Link>
          <span>/</span>
          <span className="text-foreground">Employee Mapping</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          Employee Mapping
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Link WattleOS staff accounts to their external payroll employee IDs
          {provider ? ` in ${provider === "xero" ? "Xero" : "KeyPay"}` : ""}.
          Required for timesheet sync.
        </p>
      </div>

      {!provider && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          No payroll provider configured.{" "}
          <Link
            href="/admin/settings/payroll"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Set up Xero or KeyPay
          </Link>{" "}
          before mapping employees.
        </div>
      )}

      <EmployeeMappingClient
        mappings={mappings}
        staff={staff}
        provider={provider}
      />
    </div>
  );
}
