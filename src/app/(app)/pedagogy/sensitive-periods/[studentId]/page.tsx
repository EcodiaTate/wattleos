// src/app/(app)/pedagogy/sensitive-periods/[studentId]/page.tsx
// ============================================================
// Per-student sensitive period management.
// Shows all periods (active + historical) with full material
// linking UI via PeriodCard.
// ============================================================

import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { SensitivePeriodForm } from "@/components/domain/lessons/sensitive-period-form";
import { PeriodCard } from "@/components/domain/sensitive-periods/period-card";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentSensitivePeriodsWithMaterials } from "@/lib/actions/three-period-lessons";
import { SensitivePeriodBadge } from "@/components/domain/lessons/three-period-status-badge";
import type {
  MontessoriSensitivePeriod,
  StudentSensitivePeriodFull,
} from "@/types/domain";

export const metadata = { title: "Sensitive Periods - WattleOS" };

const PERIOD_LABELS: Record<MontessoriSensitivePeriod, string> = {
  language: "Language",
  order: "Order",
  movement: "Movement",
  small_objects: "Small Objects",
  music: "Music",
  social_behavior: "Social Behaviour",
  reading: "Reading",
  writing: "Writing",
  mathematics: "Mathematics",
  refinement_of_senses: "Refinement of Senses",
};

const PERIOD_EMOJI: Record<MontessoriSensitivePeriod, string> = {
  language: "🗣️",
  order: "📐",
  movement: "🏃",
  small_objects: "🔍",
  music: "🎵",
  social_behavior: "🤝",
  reading: "📖",
  writing: "✏️",
  mathematics: "🔢",
  refinement_of_senses: "👁️",
};

interface StudentSensitivePageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ new?: string; edit?: string }>;
}

export default async function StudentSensitivePeriodsPage({
  params,
  searchParams,
}: StudentSensitivePageProps) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);

  const { studentId } = await params;
  const sp = await searchParams;
  const showNewForm = sp.new === "1";
  const editPeriodId = sp.edit ?? null;

  const supabase = await createSupabaseServerClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("id", studentId)
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .single();

  if (studentError || !student) notFound();

  const [allPeriodsResult, materialsResult] = await Promise.all([
    getStudentSensitivePeriodsWithMaterials(studentId, false),
    supabase
      .from("montessori_materials")
      .select("id, name, area")
      .eq("is_active", true)
      .order("area")
      .order("name"),
  ]);

  const allPeriods = allPeriodsResult.data ?? [];
  const materials = (materialsResult.data ?? []) as {
    id: string;
    name: string;
    area: string;
  }[];

  const activePeriods: StudentSensitivePeriodFull[] = allPeriods.filter(
    (p: StudentSensitivePeriodFull) => !p.observed_end_date,
  );
  const historicalPeriods: StudentSensitivePeriodFull[] = allPeriods.filter(
    (p: StudentSensitivePeriodFull) => p.observed_end_date,
  );
  const editingPeriod = editPeriodId
    ? (allPeriods.find(
        (p: StudentSensitivePeriodFull) => p.id === editPeriodId,
      ) ?? null)
    : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Link
          href="/pedagogy/sensitive-periods"
          className="mb-2 inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← All sensitive periods
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1
              className="text-xl font-bold sm:text-2xl"
              style={{ color: "var(--foreground)" }}
            >
              {student.first_name} {student.last_name}
            </h1>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Sensitive period observations
            </p>
          </div>
          <Link
            href={`/pedagogy/three-period-lessons/${studentId}`}
            className="text-sm"
            style={{ color: "var(--primary)" }}
          >
            3PL progress →
          </Link>
        </div>
      </div>

      {/* Edit existing period (when ?edit= is set) */}
      {canManage && editingPeriod && (
        <div className="rounded-xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Edit sensitive period
            </h2>
            <Link
              href={`/pedagogy/sensitive-periods/${studentId}`}
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cancel
            </Link>
          </div>
          <SensitivePeriodForm
            students={[
              student as { id: string; first_name: string; last_name: string },
            ]}
            materials={
              materials as Parameters<
                typeof SensitivePeriodForm
              >[0]["materials"]
            }
            existing={editingPeriod}
          />
        </div>
      )}

      {/* New period form */}
      {canManage && !editingPeriod && (
        <div className="rounded-xl border border-border p-5">
          <h2
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Record new sensitive period
          </h2>
          <SensitivePeriodForm
            students={[
              student as { id: string; first_name: string; last_name: string },
            ]}
            materials={
              materials as Parameters<
                typeof SensitivePeriodForm
              >[0]["materials"]
            }
            preSelectedStudentId={studentId}
          />
        </div>
      )}

      {/* Active periods - full PeriodCard with material linking */}
      {activePeriods.length > 0 && (
        <div>
          <h2
            className="mb-3 text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Active ({activePeriods.length})
          </h2>
          <div className="space-y-3">
            {activePeriods.map((period) => (
              <PeriodCard
                key={period.id}
                periodId={period.id}
                sensitivePeriod={period.sensitive_period}
                intensity={period.intensity}
                observedStartDate={period.observed_start_date}
                observedEndDate={period.observed_end_date}
                notes={period.notes}
                linkedMaterials={period.linked_materials}
                recentObservationCount={period.recent_observation_count}
                availableMaterials={materials}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Historical periods - compact list */}
      {historicalPeriods.length > 0 && (
        <div>
          <h2
            className="mb-3 text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Historical ({historicalPeriods.length})
          </h2>
          <div className="space-y-2">
            {historicalPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 opacity-70"
              >
                <span className="text-base">
                  {PERIOD_EMOJI[period.sensitive_period]}
                </span>
                <p
                  className="flex-1 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {PERIOD_LABELS[period.sensitive_period]}
                </p>
                <SensitivePeriodBadge intensity={period.intensity} size="sm" />
                {period.observed_end_date && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Closed {period.observed_end_date}
                  </span>
                )}
                {period.linked_materials.length > 0 && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {period.linked_materials.length} material
                    {period.linked_materials.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allPeriods.length === 0 && !showNewForm && (
        <div
          className="py-16 text-center"
          style={{ color: "var(--empty-state-icon)" }}
        >
          <div className="text-4xl">🌿</div>
          <p
            className="mt-3 text-base font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No sensitive periods recorded yet
          </p>
        </div>
      )}
    </div>
  );
}
