// src/app/(app)/pedagogy/normalization/goals/page.tsx
// ============================================================
// Set a normalization goal for a student.
// ============================================================

import { redirect } from "next/navigation";
import { GoalForm } from "@/components/domain/normalization/goal-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Set Goal - WattleOS" };

interface Props {
  searchParams: Promise<{ student?: string }>;
}

export default async function SetNormalizationGoalPage({
  searchParams,
}: Props) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_NORMALIZATION)) {
    redirect("/pedagogy/normalization");
  }

  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const studentsResult = await supabase
    .from("students")
    .select("id, first_name, last_name, preferred_name")
    .eq("tenant_id", context.tenant.id)
    .eq("enrollment_status", "enrolled")
    .is("deleted_at", null)
    .order("last_name");

  return (
    <GoalForm
      students={
        (studentsResult.data ?? []) as Array<{
          id: string;
          first_name: string;
          last_name: string;
          preferred_name: string | null;
        }>
      }
      preSelectedStudentId={params.student}
    />
  );
}
