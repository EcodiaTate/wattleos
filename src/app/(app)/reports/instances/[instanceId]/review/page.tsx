// src/app/(app)/reports/instances/[instanceId]/review/page.tsx
//
// ============================================================
// WattleOS Report Builder - Admin Review
// ============================================================
// Coordinators read the submitted report and either:
//   - Approve → report status → approved
//   - Request changes → coordinator writes notes → guide revises
//
// Uses getReportInstance for the full content, then renders
// ReviewClient for the approve/request-changes interactions.
// ============================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getReportInstance } from "@/lib/actions/reports/instances";
import { ReviewClient } from "@/components/domain/reports/ReviewClient";

interface PageProps {
  params: Promise<{ instanceId: string }>;
}

export default async function InstanceReviewPage({ params }: PageProps) {
  const { instanceId } = await params;
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports");
  }

  const result = await getReportInstance(instanceId);

  if (result.error || !result.data) {
    redirect("/reports");
  }

  const instance = result.data;

  // Can only review submitted instances
  const reviewable = ["submitted", "changes_requested", "approved"].includes(
    instance.status,
  );
  if (!reviewable) {
    redirect(`/reports/periods/${instance.report_period_id}/dashboard`);
  }

  const studentName = [
    instance.student_preferred_name ?? instance.student_first_name,
    instance.student_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground">
            Reports
          </Link>
          <span>/</span>
          <Link
            href={`/reports/periods/${instance.report_period_id}/dashboard`}
            className="hover:text-foreground"
          >
            Period
          </Link>
          <span>/</span>
          <span className="text-foreground">{studentName}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Review: {studentName}
        </h1>
        {instance.class_name && (
          <p className="mt-1 text-sm text-muted-foreground">
            {instance.class_name}
          </p>
        )}
      </div>

      <ReviewClient instance={instance} />
    </div>
  );
}
