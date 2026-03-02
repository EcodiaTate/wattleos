import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getDrill,
  getDrillParticipants,
} from "@/lib/actions/emergency-drills";
import { DrillStatusBadge } from "@/components/domain/emergency-drills/drill-status-badge";
import { DrillTimeline } from "@/components/domain/emergency-drills/drill-timeline";
import { DrillExecutionPanel } from "@/components/domain/emergency-drills/drill-execution-panel";
import { HeadcountChecker } from "@/components/domain/emergency-drills/headcount-checker";
import { DebriefForm } from "@/components/domain/emergency-drills/debrief-form";

const DRILL_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Drill ${id.slice(0, 8)} - WattleOS` };
}

export default async function DrillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_DRILLS) ||
    hasPermission(context, Permissions.MANAGE_EMERGENCY_DRILLS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_EMERGENCY_DRILLS,
  );

  const [drillResult, participantsResult] = await Promise.all([
    getDrill(id),
    getDrillParticipants(id),
  ]);

  if (drillResult.error || !drillResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {drillResult.error?.message ?? "Drill not found."}
        </p>
      </div>
    );
  }

  const drill = drillResult.data;
  const participants = participantsResult.data ?? [];
  const typeLabel =
    drill.drill_type === "other" && drill.drill_type_other
      ? drill.drill_type_other
      : DRILL_TYPE_LABELS[drill.drill_type] ?? drill.drill_type;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/emergency-drills"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Emergency Drills
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>{typeLabel}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-bold sm:text-2xl"
              style={{ color: "var(--foreground)" }}
            >
              {typeLabel}
            </h1>
            <DrillStatusBadge status={drill.status} />
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {formatDate(drill.scheduled_date)}
            {drill.scheduled_time ? ` at ${drill.scheduled_time}` : ""}
          </p>
        </div>
        {canManage && drill.status === "scheduled" && (
          <Link
            href={`/admin/emergency-drills/${drill.id}/edit`}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--muted)",
              color: "var(--foreground)",
            }}
          >
            Edit
          </Link>
        )}
      </div>

      {/* Timeline */}
      <DrillTimeline drill={drill} />

      {/* Info grid */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-[var(--radius-lg)] border border-border p-4"
        style={{ background: "var(--card)" }}
      >
        {drill.assembly_point && (
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Assembly Point
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {drill.assembly_point}
            </p>
          </div>
        )}
        {drill.scenario_description && (
          <div className="sm:col-span-2">
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Scenario
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {drill.scenario_description}
            </p>
          </div>
        )}
        {drill.evacuation_time_seconds != null && (
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Evacuation Time
            </p>
            <p
              className="mt-0.5 text-sm font-mono"
              style={{ color: "var(--foreground)" }}
            >
              {formatSeconds(drill.evacuation_time_seconds)}
            </p>
          </div>
        )}
        {drill.initiated_by_user && (
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Initiated By
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {drill.initiated_by_user.first_name}{" "}
              {drill.initiated_by_user.last_name}
            </p>
          </div>
        )}
        {drill.notes && (
          <div className="sm:col-span-2">
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Notes
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {drill.notes}
            </p>
          </div>
        )}
      </div>

      {/* Execution panel (for scheduled / in_progress) */}
      {canManage &&
        (drill.status === "scheduled" || drill.status === "in_progress") && (
          <DrillExecutionPanel drill={drill} />
        )}

      {/* Headcount checker */}
      {participants.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <HeadcountChecker
            drillId={drill.id}
            participants={participants}
            editable={
              canManage &&
              (drill.status === "in_progress" ||
                drill.status === "completed")
            }
          />
        </div>
      )}

      {/* Debrief section */}
      {drill.status === "completed" && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          {drill.effectiveness_rating ? (
            // Show debrief summary
            <div className="space-y-3">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Debrief Summary
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Effectiveness
                  </p>
                  <p
                    className="mt-0.5 text-sm font-medium capitalize"
                    style={{ color: "var(--foreground)" }}
                  >
                    {drill.effectiveness_rating}
                  </p>
                </div>
                {drill.debrief_user && (
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Conducted By
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {drill.debrief_user.first_name}{" "}
                      {drill.debrief_user.last_name}
                    </p>
                  </div>
                )}
                {drill.issues_observed && (
                  <div className="sm:col-span-2">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Issues Observed
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {drill.issues_observed}
                    </p>
                  </div>
                )}
                {drill.corrective_actions && (
                  <div className="sm:col-span-2">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Corrective Actions
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {drill.corrective_actions}
                    </p>
                  </div>
                )}
                {drill.follow_up_required && (
                  <div className="sm:col-span-2">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--drill-at-risk)" }}
                    >
                      Follow-up Required
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {drill.follow_up_notes || "See corrective actions"}
                    </p>
                    {drill.follow_up_completed_at && (
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--drill-compliant)" }}
                      >
                        Completed{" "}
                        {new Date(
                          drill.follow_up_completed_at,
                        ).toLocaleDateString("en-AU")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : canManage ? (
            // Show debrief form
            <DebriefForm drillId={drill.id} />
          ) : (
            <p
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Debrief has not been submitted yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
