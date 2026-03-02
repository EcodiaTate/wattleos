// src/app/(app)/reports/my-reports/page.tsx
//
// ============================================================
// WattleOS V2 - My Reports (Guide View)
// ============================================================
// Server Component. Shows the current guide's assigned report
// instances for the active reporting period.
//
// Upsell triggers:
//   - After 5 submissions: "WattleOS writes it automatically"
//   - If plan is free and all submitted: parent portal nudge
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  listMyInstances,
  countMySubmissions,
} from "@/lib/actions/reports/instances";
import { getActivePeriod } from "@/lib/actions/reports/periods";
import type {
  ReportInstanceWithContext,
  ReportInstanceStatus,
} from "@/types/domain";

export const metadata = { title: "My Reports - WattleOS" };

// ── Status config ─────────────────────────────────────────────

const STATUS_LABEL: Record<ReportInstanceStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  changes_requested: "Changes Requested",
  approved: "Approved",
  published: "Published",
};

const STATUS_STYLE: Record<ReportInstanceStatus, string> = {
  not_started: "bg-muted/40 text-muted-foreground",
  in_progress: "bg-info/10 text-info-foreground",
  submitted: "bg-primary/10 text-primary",
  changes_requested: "bg-warning/10 text-warning-foreground",
  approved: "bg-success/10 text-success-foreground",
  published: "bg-success/20 text-success-foreground font-semibold",
};

// ── Page ──────────────────────────────────────────────────────

export default async function MyReportsPage() {
  const context = await getTenantContext();

  // Guides need CREATE_OBSERVATION or MANAGE_REPORTS - use a general check
  const canSeeReports =
    context.permissions.includes(Permissions.MANAGE_REPORTS) ||
    context.permissions.includes(Permissions.VIEW_REPORT_PERIODS);

  if (!canSeeReports) {
    redirect("/dashboard");
  }

  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
  const isFree = planTier === "free";

  const [activePeriodResult, instancesResult, submissionCountResult] =
    await Promise.all([
      getActivePeriod(),
      listMyInstances({ per_page: 100 }),
      countMySubmissions(),
    ]);

  const activePeriod = activePeriodResult.data;
  const instances = instancesResult.data ?? [];
  const submissionCount = submissionCountResult.data ?? 0;

  // Upsell: show narrative automation nudge after 5 submissions
  const showNarrativeNudge = isFree && submissionCount >= 5;

  const notStarted = instances.filter((i) => i.status === "not_started");
  const inProgress = instances.filter(
    (i) => i.status === "in_progress" || i.status === "changes_requested",
  );
  const submitted = instances.filter((i) =>
    ["submitted", "approved", "published"].includes(i.status),
  );

  return (
    <div className="space-y-[var(--density-section-gap)]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
        {activePeriod ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Active period:{" "}
            <span className="font-medium text-foreground">
              {activePeriod.name}
            </span>
            {activePeriod.due_at && (
              <>
                {" · Due "}
                <span className="font-medium text-foreground">
                  {new Date(activePeriod.due_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No active report period at the moment.
          </p>
        )}
      </div>

      {/* Narrative automation nudge (5+ submissions, free plan) */}
      {showNarrativeNudge && (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: "var(--color-warning, #d97706)",
            backgroundColor:
              "color-mix(in srgb, var(--color-warning, #d97706) 10%, transparent)",
          }}
        >
          <span className="text-xl shrink-0 mt-0.5">⭐</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              You&apos;ve written {submissionCount} reports manually
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              With curriculum tracking connected, WattleOS auto-fills mastery
              summaries and observation highlights - so you write less and say
              more.
            </p>
          </div>
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro"
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            Upgrade to Pro
          </a>
        </div>
      )}

      {/* No active period */}
      {!activePeriod && instances.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Your administrator will assign reports to you once a reporting
            period is activated.
          </p>
        </div>
      )}

      {/* Sections */}
      {inProgress.length > 0 && (
        <InstanceSection
          title="In Progress"
          instances={inProgress}
          emptyMessage="No reports in progress."
        />
      )}

      {notStarted.length > 0 && (
        <InstanceSection
          title="Not Started"
          instances={notStarted}
          emptyMessage="All reports have been started."
        />
      )}

      {submitted.length > 0 && (
        <InstanceSection
          title="Submitted / Complete"
          instances={submitted}
          emptyMessage=""
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function InstanceSection({
  title,
  instances,
  emptyMessage,
}: {
  title: string;
  instances: ReportInstanceWithContext[];
  emptyMessage: string;
}) {
  if (instances.length === 0 && !emptyMessage) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {instances.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => (
            <InstanceRow key={instance.id} instance={instance} />
          ))}
        </div>
      )}
    </section>
  );
}

function InstanceRow({ instance }: { instance: ReportInstanceWithContext }) {
  const studentName = [
    instance.student_preferred_name ?? instance.student_first_name,
    instance.student_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const isEditable = [
    "not_started",
    "in_progress",
    "changes_requested",
  ].includes(instance.status);

  return (
    <Link
      href={`/reports/instances/${instance.id}/edit`}
      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/30 card-interactive"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{studentName}</p>
          {instance.class_name && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {instance.class_name}
            </p>
          )}
        </div>
        {instance.change_request_notes &&
          instance.status === "changes_requested" && (
            <span
              className="hidden sm:inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: "var(--color-warning, #d97706)",
                color: "#fff",
                opacity: 0.9,
              }}
            >
              Changes requested
            </span>
          )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`status-badge status-badge-plain px-2 py-0.5 text-xs ${STATUS_STYLE[instance.status as ReportInstanceStatus]}`}
        >
          {STATUS_LABEL[instance.status as ReportInstanceStatus]}
        </span>
        {isEditable && (
          <span className="text-xs font-medium text-primary">Edit →</span>
        )}
      </div>
    </Link>
  );
}
