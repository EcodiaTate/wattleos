// src/app/(app)/reports/page.tsx
//
// ============================================================
// WattleOS Report Builder - Coordinator Home
// ============================================================
// The main entry point for the standalone Report Builder
// product. Coordinators see: setup checklist (until dismissed),
// active period status, quick nav to all sections.
//
// Guides are redirected to /reports/my-reports.
// Users with no report permissions are redirected to /dashboard.
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getActivePeriod,
  listReportPeriods,
} from "@/lib/actions/reports/periods";
import { listReportTemplates } from "@/lib/actions/reports/templates";
import { getStudentCount } from "@/lib/actions/reports/report-builder-students";
import { getGuideCount } from "@/lib/actions/reports/guide-invitations";

export const metadata = { title: "Reports - WattleOS" };

// ── Milestone expansion prompt 1 (verbatim from brief) ───────
// Shown when the coordinator has set up their account
// but hasn't created a period yet.

export default async function ReportsPage() {
  const context = await getTenantContext();

  // Guides go directly to their instance list
  if (
    !context.permissions.includes(Permissions.MANAGE_REPORT_PERIODS) &&
    !context.permissions.includes(Permissions.MANAGE_REPORTS)
  ) {
    if (context.permissions.includes(Permissions.VIEW_REPORT_PERIODS)) {
      redirect("/reports/my-reports");
    }
    redirect("/dashboard");
  }

  const isAdmin = context.permissions.includes(
    Permissions.MANAGE_REPORT_PERIODS,
  );

  // For non-admin coordinators send to my-reports
  if (!isAdmin) {
    redirect("/reports/my-reports");
  }

  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
  const isFree = planTier === "free";

  const [
    activePeriodResult,
    periodsResult,
    templatesResult,
    studentCountResult,
    guideCountResult,
  ] = await Promise.all([
    getActivePeriod(),
    listReportPeriods({ page: 1, per_page: 10 }),
    listReportTemplates(),
    getStudentCount(),
    getGuideCount(),
  ]);

  const activePeriod = activePeriodResult.data ?? null;
  const periods = periodsResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const studentCount = studentCountResult.data ?? 0;
  const guideCount = guideCountResult.data ?? 0;

  // Onboarding checklist: steps complete?
  const hasTemplate = templates.length > 0;
  const hasStudents = studentCount > 0;
  const hasGuides = guideCount > 0;
  const setupComplete = hasTemplate && hasStudents;
  const onboardingDone = hasTemplate && hasStudents && hasGuides;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.tenant.name}
        </p>
      </div>

      {/* ── Onboarding checklist (shown until all 3 steps done) ── */}
      {!onboardingDone && (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Get started
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Complete these steps to run your first report period.
          </p>
          <div className="space-y-3">
            <SetupStep
              done={hasTemplate}
              label="Create a report template"
              description="Design the structure of your reports - sections, narrative prompts, and any auto-fill fields."
              href="/reports/templates"
              cta="Open templates"
            />
            <SetupStep
              done={hasStudents}
              label="Add your students"
              description="Add students manually or import a CSV. You can add up to 40 students on the free plan."
              href="/reports/students"
              cta="Add students"
            />
            <SetupStep
              done={hasGuides}
              label="Invite your guides"
              description="Guides write the reports. Invite them by email - they'll set up their own login."
              href="/reports/guides"
              cta="Invite guides"
            />
          </div>

          {/* Milestone prompt 1 - once setup is done, nudge to create first period */}
          {setupComplete && !activePeriod && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{
                background:
                  "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                borderLeft: "3px solid var(--color-primary)",
              }}
            >
              <p className="text-sm font-semibold text-foreground">
                You&apos;re set up - start your first report period
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a report period to assign reports to your guides.
                They&apos;ll see their students immediately in My Reports.
              </p>
              <Link
                href="/reports/periods/new"
                className="mt-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-foreground, #fff)",
                }}
              >
                Create report period
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Active period status ────────────────────────────────── */}
      {activePeriod ? (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Active period
              </p>
              <h2 className="text-lg font-bold text-foreground">
                {activePeriod.name}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                {activePeriod.term && <span>{activePeriod.term}</span>}
                {activePeriod.academic_year && (
                  <span>{activePeriod.academic_year}</span>
                )}
                {activePeriod.due_at && (
                  <span>
                    Due{" "}
                    {new Date(activePeriod.due_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/reports/periods/${activePeriod.id}/dashboard`}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              View dashboard →
            </Link>
          </div>

          {/* Milestone expansion prompt 2 (verbatim from brief):
              "You've filled in {N} reports by hand this term. With observations connected,
               WattleOS could have pre-filled those for you." */}
          {isFree && studentCount >= 10 && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{
                background:
                  "color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent)",
                borderLeft: "3px solid var(--color-warning, #d97706)",
              }}
            >
              <p className="text-sm font-semibold text-foreground">
                You&apos;re managing {studentCount} students by hand this term
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                With observations and curriculum tracking connected, WattleOS
                could pre-fill mastery summaries and pull highlights
                automatically - so your guides write less and say more.
              </p>
              <a
                href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro%20-%20Report%20Builder"
                className="mt-2 inline-flex items-center text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--color-primary)" }}
              >
                Ask about Pro →
              </a>
            </div>
          )}
        </div>
      ) : (
        periods.length > 0 && (
          /* No active period but has past periods - prompt to create next one */
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              No active report period
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your last period has been closed. Create a new one to start the
              next round of reports.
            </p>
            <Link
              href="/reports/periods/new"
              className="mt-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground, #fff)",
              }}
            >
              New report period
            </Link>
          </div>
        )
      )}

      {/* ── Quick nav grid ──────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Manage</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NavCard
            href="/reports/periods"
            label="Periods"
            description="Manage report periods and track progress"
            icon="📋"
          />
          <NavCard
            href="/reports/templates"
            label="Templates"
            description="Design the structure of your reports"
            icon="📄"
          />
          <NavCard
            href="/reports/students"
            label={`Students ${studentCount > 0 ? `(${studentCount})` : ""}`}
            description="Add, edit or import student records"
            icon="🎒"
          />
          <NavCard
            href="/reports/guides"
            label={`Guides ${guideCount > 0 ? `(${guideCount})` : ""}`}
            description="Invite guides and manage assignments"
            icon="👤"
          />
          <NavCard
            href="/reports/settings"
            label="Settings"
            description="Logo, school name, PDF branding"
            icon="⚙️"
          />
          {isFree && (
            <div
              className="rounded-xl border p-4 cursor-default"
              style={{
                borderColor: "var(--color-border)",
                background:
                  "color-mix(in srgb, var(--color-muted) 40%, transparent)",
              }}
            >
              <p className="text-sm font-medium text-muted-foreground">
                📊 Analytics
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Available on Pro
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Milestone expansion prompt 3 (verbatim from brief):
          "Your reports are approved and parents are waiting. Deliver via the portal instead of printing." ──
          Shown at bottom when all reports are approved on free tier */}
      {isFree && onboardingDone && !activePeriod && periods.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-warning, #d97706)",
            background:
              "color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent)",
          }}
        >
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--color-warning-fg)" }}
          >
            Your reports are approved and parents are waiting
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-warning-fg)", opacity: 0.85 }}
          >
            Deliver reports to parents instantly through the WattleOS parent
            portal instead of printing or emailing. No more manual distribution.
          </p>
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro%20-%20Parent%20Portal"
            className="mt-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-warning-fg)",
              color: "var(--color-background)",
            }}
          >
            Deliver via parent portal
          </a>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SetupStep({
  done,
  label,
  description,
  href,
  cta,
}: {
  done: boolean;
  label: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: done
            ? "var(--color-success, #22c55e)"
            : "var(--color-muted)",
          color: done ? "#fff" : "var(--color-muted-foreground)",
        }}
      >
        {done ? "✓" : ""}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color: done
              ? "var(--color-muted-foreground)"
              : "var(--color-foreground)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {label}
        </p>
        {!done && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
            <Link
              href={href}
              className="mt-1.5 inline-flex items-center text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              {cta} →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function NavCard({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30 card-interactive"
    >
      <p className="text-sm font-medium text-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
