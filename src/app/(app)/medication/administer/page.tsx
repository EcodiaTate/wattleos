// src/app/(app)/medication/administer/page.tsx
//
// ============================================================
// Quick Administer - record a medication dose (Reg 94)
// ============================================================
// Educator selects student → picks from active authorisations
// → records dose, witness, and parent notification.
// Reg 94 requires: medication name, dose, route, time,
// who administered, who witnessed, parent notified.
// ============================================================

import { AdministerForm } from "@/components/domain/medication/administer-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Administer Medication" };

export default async function AdministerPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.ADMINISTER_MEDICATION)) {
    redirect("/medication");
  }

  const supabase = await createSupabaseServerClient();

  // Load students who have active authorisations
  const { data: auths } = await supabase
    .from("medication_authorisations")
    .select(
      "id, student_id, medication_name, dose, route, frequency, is_active, valid_until, student:students(id, first_name, last_name, preferred_name)",
    )
    .eq("tenant_id", context.tenant.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("medication_name", { ascending: true });

  // Load staff for witness selection
  const { data: tenantUsers } = await supabase
    .from("tenant_users")
    .select("user_id")
    .eq("tenant_id", context.tenant.id)
    .eq("status", "active")
    .is("deleted_at", null);

  const staffUserIds = tenantUsers?.map((tu) => tu.user_id) ?? [];
  const { data: staff } =
    staffUserIds.length > 0
      ? await supabase
          .from("users")
          .select("id, first_name, last_name")
          .in("id", staffUserIds)
      : {
          data: [] as {
            id: string;
            first_name: string | null;
            last_name: string | null;
          }[],
        };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Administer Medication
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Regulation 94 - record every dose. Select the child, choose their
          authorised medication, and record the details.
        </p>
      </div>

      <AdministerForm
        authorisations={
          (auths ?? []) as unknown as Array<{
            id: string;
            student_id: string;
            medication_name: string;
            dose: string;
            route: string;
            frequency: string;
            is_active: boolean;
            valid_until: string | null;
            student: {
              id: string;
              first_name: string;
              last_name: string;
              preferred_name: string | null;
            } | null;
          }>
        }
        staff={staff ?? []}
        currentUserId={context.user.id}
      />
    </div>
  );
}
