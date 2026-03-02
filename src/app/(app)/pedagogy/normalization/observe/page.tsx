// src/app/(app)/pedagogy/normalization/observe/page.tsx
// ============================================================
// Record a normalization observation for a student.
// ============================================================

import { redirect } from "next/navigation";
import { ObservationForm } from "@/components/domain/normalization/observation-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Record Observation - WattleOS" };

interface Props {
  searchParams: Promise<{ student?: string }>;
}

export default async function RecordNormalizationObservationPage({
  searchParams,
}: Props) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_NORMALIZATION)) {
    redirect("/pedagogy/normalization");
  }

  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const [studentsResult, classesResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .eq("tenant_id", context.tenant.id)
      .eq("enrollment_status", "enrolled")
      .is("deleted_at", null)
      .order("last_name"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <ObservationForm
      students={
        (studentsResult.data ?? []) as Array<{
          id: string;
          first_name: string;
          last_name: string;
          preferred_name: string | null;
        }>
      }
      classes={
        (classesResult.data ?? []) as Array<{ id: string; name: string }>
      }
    />
  );
}
