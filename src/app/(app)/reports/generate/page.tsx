// src/app/(app)/reports/generate/page.tsx
//
// ============================================================
// WattleOS V2 - Generate Reports Page
// ============================================================
// Server Component. Loads available templates and student lists
// for the generation form. The actual generation happens in the
// client form component via server actions.
//
// WHY server wrapper: We need templates and class/student data
// for the selection UI. Fetching on the server avoids waterfall
// requests and gives instant page load.
// ============================================================

import { GenerateReportsForm } from "@/components/domain/reports/GenerateReportsForm";
import { listReportTemplates } from "@/lib/actions/reports";
import { listClasses } from "@/lib/actions/sis";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GenerateReportsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect("/dashboard");
  }

  // Fetch templates and classes in parallel
  const [templatesResult, classesResult] = await Promise.all([
    listReportTemplates({ activeOnly: true }),
    listClasses(),
  ]);

  const templates = templatesResult.data ?? [];
  const classes = classesResult.data ?? [];

  if (templates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">Generate</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            Generate Reports
          </h1>
        </div>
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <p className="text-sm text-muted-foreground">
            You need at least one active report template to generate reports.
          </p>
          <Link
            href="/reports/templates/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700"
          >
            Create a Template
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground">
            Reports
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">Generate</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Generate Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a template, pick students, and generate pre-populated reports
          for the term.
        </p>
      </div>

      <GenerateReportsForm
        templates={templates.map((t) => {
          const contentObj = t.content as Record<string, unknown> | null;
          const sectionsArr =
            contentObj && Array.isArray(contentObj.sections)
              ? contentObj.sections
              : [];
          return {
            id: t.id,
            name: t.name,
            cycleLevel: t.cycle_level,
            sectionCount: sectionsArr.length,
          };
        })}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          cycleLevel: c.cycle_level,
          studentCount: c.active_enrollment_count,
        }))}
      />
    </div>
  );
}
