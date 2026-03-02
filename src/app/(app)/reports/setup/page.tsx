// src/app/(app)/reports/setup/page.tsx
//
// ============================================================
// WattleOS Report Builder - Onboarding Setup
// ============================================================
// Post-signup checklist. Walked through after /report-builder/signup
// redirects to /reports/setup.
//
// Steps:
//   1. Create a report template
//   2. Add students (or import CSV)
//   3. Invite your first guide
//   4. Create your first report period
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listReportTemplates } from "@/lib/actions/reports/templates";
import { getStudentCount } from "@/lib/actions/reports/report-builder-students";
import { getGuideCount } from "@/lib/actions/reports/guide-invitations";
import { getActivePeriod } from "@/lib/actions/reports/periods";

export const metadata = { title: "Setup - WattleOS Reports" };

export default async function ReportsSetupPage() {
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports");
  }

  const [
    templatesResult,
    studentCountResult,
    guideCountResult,
    activePeriodResult,
  ] = await Promise.all([
    listReportTemplates(),
    getStudentCount(),
    getGuideCount(),
    getActivePeriod(),
  ]);

  const hasTemplate = (templatesResult.data ?? []).length > 0;
  const hasStudents = (studentCountResult.data ?? 0) > 0;
  const hasGuides = (guideCountResult.data ?? 0) > 0;
  const hasPeriod = !!activePeriodResult.data;

  const stepsComplete = [hasTemplate, hasStudents, hasGuides, hasPeriod].filter(
    Boolean,
  ).length;
  const totalSteps = 4;
  const allDone = stepsComplete === totalSteps;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/reports"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Reports
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          {allDone ? "You're all set 🎉" : "Set up your report builder"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {allDone
            ? "Everything is ready. Your guides can start writing reports."
            : `${stepsComplete} of ${totalSteps} steps complete`}
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--color-muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(stepsComplete / totalSteps) * 100}%`,
            background: allDone
              ? "var(--color-success, #22c55e)"
              : "var(--color-primary)",
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <SetupCard
          step={1}
          done={hasTemplate}
          label="Create a report template"
          description="Design the structure of your reports - narrative sections, curriculum progress, goals. A sample Montessori template has been created for you to customise."
          href="/reports/templates"
          cta="Open templates"
        />
        <SetupCard
          step={2}
          done={hasStudents}
          label="Add your students"
          description="Add students manually or import a CSV file. Include class labels so guides only see their own students."
          href="/reports/students"
          cta="Add students"
          hint="Free plan: up to 40 students"
        />
        <SetupCard
          step={3}
          done={hasGuides}
          label="Invite a guide"
          description="Guides write the reports. They receive an email with a link to create their account and see their assigned students straight away."
          href="/reports/guides"
          cta="Invite a guide"
          hint="Free plan: up to 5 guides"
        />
        <SetupCard
          step={4}
          done={hasPeriod}
          label="Create a report period"
          description="A report period groups all reports for a single term. Creating one generates a report instance for every student. Set a due date so guides know when to submit."
          href="/reports/periods/new"
          cta="Create period"
          hint={
            hasStudents && hasTemplate
              ? undefined
              : "Add students and a template first"
          }
        />
      </div>

      {/* Done state CTA */}
      {allDone && (
        <div
          className="rounded-xl border p-5 text-center"
          style={{
            borderColor: "var(--color-success, #22c55e)",
            background:
              "color-mix(in srgb, var(--color-success, #22c55e) 8%, transparent)",
          }}
        >
          <p className="text-sm font-medium text-foreground">
            Your guides can now log in at{" "}
            <span className="font-semibold">
              wattleos.com.au/report-builder/login
            </span>{" "}
            and start writing reports.
          </p>
          <Link
            href="/reports"
            className="mt-3 inline-flex items-center rounded-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            Go to Reports home
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SetupCard({
  step,
  done,
  label,
  description,
  href,
  cta,
  hint,
}: {
  step: number;
  done: boolean;
  label: string;
  description: string;
  href: string;
  cta: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: done
          ? "var(--color-success, #22c55e)"
          : "var(--color-border)",
        background: done
          ? "color-mix(in srgb, var(--color-success, #22c55e) 5%, var(--color-card))"
          : "var(--color-card)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Step indicator */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: done
              ? "var(--color-success, #22c55e)"
              : "var(--color-muted)",
            color: done ? "#fff" : "var(--color-muted-foreground)",
          }}
        >
          {done ? "✓" : step}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm"
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
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={href}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--color-primary)",
                    color: "var(--color-primary-foreground, #fff)",
                  }}
                >
                  {cta}
                </Link>
                {hint && (
                  <span className="text-xs text-muted-foreground">{hint}</span>
                )}
              </div>
            </>
          )}
          {done && (
            <Link
              href={href}
              className="mt-1 inline-flex items-center text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Edit →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
