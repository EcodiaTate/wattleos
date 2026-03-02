// src/app/(app)/reports/instances/[instanceId]/edit/page.tsx
//
// ============================================================
// WattleOS V2 - Report Instance Editor (Guide View)
// ============================================================
// Server Component: fetches instance + template, resolves plan
// tier, then hands off to the client editor for autosave and
// interactive section editing.
//
// Access: assigned guide OR admin with MANAGE_REPORT_PERIODS.
// Redirect to /reports/my-reports if not found or no access.
// ============================================================

import { InstanceEditor } from "@/components/domain/reports/InstanceEditor";
import { getReportInstance } from "@/lib/actions/reports/instances";
import { getReportTemplate } from "@/lib/actions/reports/templates";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { isSectionTypePaid } from "@/lib/plg/plan-gating";
import type { TemplateContent, TemplateSection } from "@/lib/reports/types";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ instanceId: string }>;
}

export default async function InstanceEditorPage({ params }: PageProps) {
  const { instanceId } = await params;
  const context = await getTenantContext();
  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";

  const result = await getReportInstance(instanceId);

  if (result.error || !result.data) {
    redirect("/reports/my-reports");
  }

  const instance = result.data;

  // Editors: assigned guide or report-period admins
  const isAdmin = context.permissions.includes("manage_report_periods");
  const isOwner = instance.assigned_guide_id === context.user.id;

  if (!isAdmin && !isOwner) {
    redirect("/reports/my-reports");
  }

  // Non-editable statuses - redirect to a read-only view
  // (for now, admins reviewing submitted reports stay here)
  const isEditable = [
    "not_started",
    "in_progress",
    "changes_requested",
  ].includes(instance.status);

  // Fetch template sections (needed for section metadata + gating)
  let sections: TemplateSection[] = [];
  if (instance.template_id) {
    const templateResult = await getReportTemplate(instance.template_id);
    if (templateResult.data) {
      const content = templateResult.data.content as unknown as TemplateContent;
      sections = Array.isArray(content?.sections) ? content.sections : [];
    }
  }

  // Mark which sections are locked on this plan tier
  const sectionsWithGating = sections.map((s) => ({
    ...s,
    isPaidLocked: isSectionTypePaid(s.type) && planTier === "free",
  }));

  const studentName = [
    instance.student_preferred_name ?? instance.student_first_name,
    instance.student_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports/my-reports" className="hover:text-foreground">
              My Reports
            </Link>
            <span>/</span>
            <span className="text-foreground">{studentName}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {studentName}
          </h1>
          {instance.class_name && (
            <p className="mt-1 text-sm text-muted-foreground">
              {instance.class_name}
            </p>
          )}
          {instance.period_name && (
            <p className="text-sm text-muted-foreground">
              {instance.period_name}
            </p>
          )}
        </div>
      </div>

      {/* Change request banner */}
      {instance.status === "changes_requested" &&
        instance.change_request_notes && (
          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: "var(--color-warning)",
              background: "var(--color-warning-subtle)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-warning-fg)" }}
            >
              Changes requested
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--color-warning-fg)" }}
            >
              {instance.change_request_notes}
            </p>
          </div>
        )}

      {/* Submitted / non-editable notice */}
      {!isEditable && (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-sm text-muted-foreground">
            This report has been{" "}
            <strong>{instance.status.replace(/_/g, " ")}</strong> and can no
            longer be edited.
          </p>
        </div>
      )}

      {/* Editor */}
      <InstanceEditor
        instance={instance}
        sections={sectionsWithGating}
        isEditable={isEditable}
        planTier={planTier}
      />
    </div>
  );
}
