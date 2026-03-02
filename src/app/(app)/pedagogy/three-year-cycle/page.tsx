// src/app/(app)/pedagogy/three-year-cycle/page.tsx
// ============================================================
// Three-Year Cycle Progress - class-wide heatmap view
// ============================================================

import { redirect } from "next/navigation";
import { ClassCycleHeatmap } from "@/components/domain/three-year-cycle/class-cycle-heatmap";
import { getClassCycleReport } from "@/lib/actions/three-year-cycle";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Three-Year Cycle Progress - WattleOS" };

interface Props {
  searchParams: Promise<{ class?: string }>;
}

export default async function ThreeYearCyclePage({ searchParams }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const params = await searchParams;
  const selectedClassId = params.class ?? null;

  const supabase = await createSupabaseServerClient();

  const [reportResult, classesResult] = await Promise.all([
    getClassCycleReport(selectedClassId),
    supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const report = reportResult.data ?? {
    class_id: selectedClassId,
    class_name: null,
    generated_at: new Date().toISOString(),
    students: [],
    area_totals: {
      practical_life: 0,
      sensorial: 0,
      language: 0,
      mathematics: 0,
      cultural: 0,
    },
  };

  return (
    <ClassCycleHeatmap
      report={report}
      classes={
        (classesResult.data ?? []) as Array<{ id: string; name: string }>
      }
      selectedClassId={selectedClassId}
    />
  );
}
