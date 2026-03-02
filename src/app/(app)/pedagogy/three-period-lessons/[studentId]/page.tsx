// src/app/(app)/pedagogy/three-period-lessons/[studentId]/page.tsx
// ============================================================
// Per-student three-period lesson progress view.
// Shows all materials this student has had 3PL sessions on,
// with current period status and history.
// ============================================================

import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { ThreePeriodProgressCard } from "@/components/domain/lessons/three-period-progress-card";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentThreePeriodProgress } from "@/lib/actions/three-period-lessons";
import { getStudentSensitivePeriods } from "@/lib/actions/three-period-lessons";

import { SensitivePeriodBadge } from "@/components/domain/lessons/three-period-status-badge";
import type {
  MaterialThreePeriodProgress,
  MontessoriSensitivePeriod,
  StudentSensitivePeriodWithDetails,
} from "@/types/domain";

export const metadata = { title: "3PL Progress - WattleOS" };

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

interface StudentProgressPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function StudentThreePeriodProgressPage({
  params,
}: StudentProgressPageProps) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/pedagogy/three-period-lessons");

  const canManage = hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  const { studentId } = await params;

  const supabase = await createSupabaseServerClient();

  // Verify student belongs to this tenant
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("id", studentId)
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .single();

  if (studentError || !student) notFound();

  const [progressResult, sensitiveResult] = await Promise.all([
    getStudentThreePeriodProgress(studentId),
    getStudentSensitivePeriods(studentId, true),
  ]);

  const progressItems: MaterialThreePeriodProgress[] =
    progressResult.data ?? [];
  const activeSensitivePeriods: StudentSensitivePeriodWithDetails[] =
    sensitiveResult.data ?? [];

  // Sort by area, then by current_period (in-progress first)
  const sorted = [...progressItems].sort((a, b) => {
    if (a.area < b.area) return -1;
    if (a.area > b.area) return 1;
    const aComplete = a.current_period === "complete" ? 1 : 0;
    const bComplete = b.current_period === "complete" ? 1 : 0;
    return aComplete - bComplete;
  });

  const completeCount = progressItems.filter(
    (p) => p.current_period === "complete",
  ).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Link
          href="/pedagogy/three-period-lessons"
          className="mb-2 inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← All students
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
              {progressItems.length} material
              {progressItems.length !== 1 ? "s" : ""} · {completeCount} complete
            </p>
          </div>
          {canManage && (
            <Link
              href={`/pedagogy/three-period-lessons/record?studentId=${studentId}`}
              className="active-push touch-target rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Record lesson
            </Link>
          )}
        </div>
      </div>

      {/* Active sensitive periods */}
      {activeSensitivePeriods.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              🌿 Active sensitive periods
            </h2>
            {canManage && (
              <Link
                href={`/pedagogy/sensitive-periods/${studentId}`}
                className="text-xs"
                style={{ color: "var(--primary)" }}
              >
                Manage →
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSensitivePeriods.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
              >
                <span>{PERIOD_EMOJI[sp.sensitive_period]}</span>
                <div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {PERIOD_LABELS[sp.sensitive_period]}
                  </p>
                  <SensitivePeriodBadge
                    intensity={sp.intensity}
                    size="sm"
                    showEmoji={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record sensitive period CTA */}
      {activeSensitivePeriods.length === 0 && canManage && (
        <Link
          href={`/pedagogy/sensitive-periods/${studentId}?new=1`}
          className="card-interactive flex items-center gap-3 rounded-xl border border-dashed border-border p-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span className="text-2xl">🌿</span>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Record a sensitive period
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Note observed developmental windows for this child
            </p>
          </div>
        </Link>
      )}

      {/* Progress cards */}
      {sorted.length === 0 ? (
        <div
          className="py-16 text-center"
          style={{ color: "var(--empty-state-icon)" }}
        >
          <div className="text-4xl">🔢</div>
          <p
            className="mt-3 text-base font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No three-period lessons yet
          </p>
          {canManage && (
            <Link
              href={`/pedagogy/three-period-lessons/record?studentId=${studentId}`}
              className="mt-3 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Record first lesson
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((progress) => (
            <ThreePeriodProgressCard
              key={progress.material_id}
              progress={progress}
              studentId={studentId}
              onRecord={
                canManage
                  ? (materialId) => {
                      window.location.href = `/pedagogy/three-period-lessons/record?studentId=${studentId}&materialId=${materialId}`;
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
