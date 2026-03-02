// src/app/(app)/medication/student/[studentId]/page.tsx
//
// ============================================================
// Student Medication Profile - plans, authorisations, log
// ============================================================

import { StudentMedicationProfile } from "@/components/domain/medication/student-medication-profile";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import {
  listPlansForStudent,
  listAuthorisationsForStudent,
  listAdministrationsForStudent,
} from "@/lib/actions/medication-admin";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentMedicationPage({ params }: Props) {
  const { studentId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_MEDICATION_RECORDS)) {
    redirect("/medication");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_MEDICATION_PLANS);
  const canAdminister = hasPermission(
    context,
    Permissions.ADMINISTER_MEDICATION,
  );

  const supabase = await createSupabaseServerClient();

  // Load student details
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, preferred_name, photo_url")
    .eq("id", studentId)
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .single();

  if (!student) notFound();

  // Load staff for witness/admin dropdowns
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

  const [plansResult, authsResult, adminsResult] = await Promise.all([
    listPlansForStudent(studentId, false),
    listAuthorisationsForStudent(studentId, false),
    listAdministrationsForStudent(studentId, { per_page: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StudentMedicationProfile
        student={student}
        plans={plansResult.data ?? []}
        authorisations={authsResult.data ?? []}
        administrations={adminsResult.data ?? []}
        adminTotal={adminsResult.pagination.total}
        staff={staff ?? []}
        currentUserId={context.user.id}
        canManage={canManage}
        canAdminister={canAdminister}
      />
    </div>
  );
}
