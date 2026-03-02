// src/app/(app)/reports/periods/[periodId]/instances/[instanceId]/page.tsx
//
// ============================================================
// WattleOS V2 - Admin Instance Review Page
// ============================================================
// Admin reads the submitted report, then approves, requests
// changes, or publishes (approve + PDF in one step).
//
// If the instance is approved, shows a publish button that
// generates the PDF and transitions to published.
// ============================================================

import { AdminInstanceReviewClient } from "@/components/domain/reports/AdminInstanceReviewClient";
import { getReportInstance } from "@/lib/actions/reports/instances";
import { getReportTemplate } from "@/lib/actions/reports/templates";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { TemplateContent, TemplateSection } from "@/lib/reports/types";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ periodId: string; instanceId: string }>;
}

export default async function AdminInstanceReviewPage({ params }: PageProps) {
  const { periodId, instanceId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports/periods");
  }

  const result = await getReportInstance(instanceId);

  if (result.error || !result.data) {
    redirect(`/reports/periods/${periodId}/instances`);
  }

  const instance = result.data;
  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";

  // Fetch template sections for rendering content labels
  let sections: TemplateSection[] = [];
  if (instance.template_id) {
    const templateResult = await getReportTemplate(instance.template_id);
    if (templateResult.data) {
      const content = templateResult.data.content as unknown as TemplateContent;
      sections = Array.isArray(content?.sections) ? content.sections : [];
    }
  }

  const studentName =
    [
      instance.student_preferred_name ?? instance.student_first_name,
      instance.student_last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Unknown Student";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports/periods" className="hover:text-foreground">
            Periods
          </Link>
          <span>/</span>
          <Link
            href={`/reports/periods/${periodId}/dashboard`}
            className="hover:text-foreground"
          >
            {instance.period_name}
          </Link>
          <span>/</span>
          <Link
            href={`/reports/periods/${periodId}/instances`}
            className="hover:text-foreground"
          >
            Instances
          </Link>
          <span>/</span>
          <span className="text-foreground">{studentName}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {studentName}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {instance.class_name && <span>{instance.class_name}</span>}
          {instance.assigned_guide_name && (
            <span>Guide: {instance.assigned_guide_name}</span>
          )}
          {instance.period_name && <span>{instance.period_name}</span>}
        </div>
      </div>

      {/* Client - review actions + content display */}
      <AdminInstanceReviewClient
        instance={instance}
        sections={sections}
        periodId={periodId}
        planTier={planTier}
      />
    </div>
  );
}
