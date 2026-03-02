// src/app/(app)/medication/register/page.tsx
//
// ============================================================
// Medication Register - full administration log (Reg 94)
// ============================================================
// Paginated, filterable table of every dose ever administered.
// Regulatory requirement: must be available for inspection.
// ============================================================

import { MedicationRegister } from "@/components/domain/medication/medication-register";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { listMedicationRegister } from "@/lib/actions/medication-admin";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Medication Register" };

interface Props {
  searchParams: Promise<{
    student_id?: string;
    medication?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function MedicationRegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_MEDICATION_RECORDS)) {
    redirect("/medication");
  }

  const page = parseInt(sp.page ?? "1", 10);

  const result = await listMedicationRegister({
    student_id: sp.student_id,
    medication_name: sp.medication,
    from_date: sp.from,
    to_date: sp.to,
    page,
    per_page: 25,
  });

  // Load student list for filter dropdown
  const supabase = await createSupabaseServerClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .order("last_name", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Medication Register
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Regulation 94 - complete record of every medication administration.
        </p>
      </div>

      <MedicationRegister
        administrations={result.data ?? []}
        total={result.pagination.total}
        currentPage={page}
        totalPages={result.pagination.total_pages}
        students={students ?? []}
        initialFilters={{
          student_id: sp.student_id ?? "",
          medication: sp.medication ?? "",
          from: sp.from ?? "",
          to: sp.to ?? "",
        }}
      />
    </div>
  );
}
