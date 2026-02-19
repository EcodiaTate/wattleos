// src/app/(app)/admin/billing/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Billing Dashboard
// ============================================================
// Server Component. Permission-gated to MANAGE_INTEGRATIONS.
// Loads invoices, fee schedules, and student/guardian data for
// the billing management UI.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listInvoices, listFeeSchedules } from "@/lib/actions/billing";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BillingDashboardClient } from "@/components/domain/billing/billing-dashboard-client";

export default async function BillingPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_INTEGRATIONS)) {
    redirect("/dashboard");
  }

  // Load data in parallel
  const [invoicesResult, feeSchedulesResult, supabase] = await Promise.all([
    listInvoices(),
    listFeeSchedules(),
    createSupabaseServerClient(),
  ]);

  // Load students with active enrollments + their guardians for invoice creation
  const { data: studentsRaw } = await supabase
    .from("students")
    .select(
      `
      id, first_name, last_name,
      guardians(
        id, relationship, user_id,
        user:users(id, first_name, last_name, email)
      )
    `
    )
    .eq("enrollment_status", "active")
    .is("deleted_at", null)
    .order("last_name");

  // Normalize the raw PostgREST shape (user sometimes comes back as an array)
  const students: StudentWithGuardians[] = (studentsRaw ?? []).map((s: any) => {
    const guardians = Array.isArray(s.guardians) ? s.guardians : [];

    const normalizedGuardians: StudentWithGuardians["guardians"] = guardians
      .map((g: any) => {
        const u = Array.isArray(g.user) ? g.user[0] : g.user; // <-- fix: array -> single
        if (!u) return null;

        return {
          id: String(g.id),
          relationship: String(g.relationship ?? ""),
          user_id: String(g.user_id ?? ""),
          user: {
            id: String(u.id),
            first_name: u.first_name ?? null,
            last_name: u.last_name ?? null,
            email: String(u.email ?? ""),
          },
        };
      })
      .filter(Boolean) as StudentWithGuardians["guardians"];

    return {
      id: String(s.id),
      first_name: String(s.first_name ?? ""),
      last_name: String(s.last_name ?? ""),
      guardians: normalizedGuardians,
    };
  });

  // Load classes for fee schedule linking
  const { data: classesRaw } = await supabase
    .from("classes")
    .select("id, name, cycle_level")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name");

  const classes: ClassOption[] = (classesRaw ?? []).map((c: any) => ({
    id: String(c.id),
    name: String(c.name ?? ""),
    cycle_level: c.cycle_level ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage tuition fees, create invoices, and track payments.
        </p>
      </div>

      <BillingDashboardClient
        invoices={invoicesResult.data ?? []}
        feeSchedules={feeSchedulesResult.data ?? []}
        students={students}
        classes={classes}
        currency={context.tenant.currency.toLowerCase()}
      />
    </div>
  );
}

// Local types for the page data shape
interface StudentWithGuardians {
  id: string;
  first_name: string;
  last_name: string;
  guardians: Array<{
    id: string;
    relationship: string;
    user_id: string;
    user: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  }>;
}

interface ClassOption {
  id: string;
  name: string;
  cycle_level: string | null;
}
