// src/app/(app)/admin/naplan/[windowId]/results/[studentId]/page.tsx
//
// Per-student results entry - enter domain results for one student at a time.

import Link from "next/link";
import { notFound } from "next/navigation";

import { NaplanStudentResultsClient } from "@/components/domain/naplan/naplan-student-results-client";
import { NaplanWindowStatusBadge } from "@/components/domain/naplan/naplan-window-status-badge";
import { getStudentRecord, getTestWindow } from "@/lib/actions/naplan";
import { hasPermission, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Student Results - NAPLAN" };

interface Props {
  params: Promise<{ windowId: string; studentId: string }>;
}

export default async function NaplanStudentResultsPage({ params }: Props) {
  const { windowId, studentId } = await params;
  const context = await requirePermission(Permissions.VIEW_NAPLAN);
  const canManage = hasPermission(context, Permissions.MANAGE_NAPLAN);

  const [windowResult, recordResult] = await Promise.all([
    getTestWindow(windowId),
    getStudentRecord(studentId),
  ]);

  if (
    windowResult.error ||
    !windowResult.data ||
    recordResult.error ||
    !recordResult.data
  )
    notFound();

  const window = windowResult.data;
  const record = recordResult.data;
  const student = record.cohort_entry.student;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/naplan/${windowId}/results`}
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              ← Results
            </Link>
            <span style={{ color: "var(--muted-foreground)" }}>/</span>
            <NaplanWindowStatusBadge status={window.status} size="sm" />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {student.first_name} {student.last_name}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Year {record.cohort_entry.year_level} · NAPLAN{" "}
            {window.collection_year}
          </p>
        </div>
      </div>

      {record.cohort_entry.is_opted_out && (
        <div
          className="rounded-lg border border-border p-4"
          style={{
            background: "var(--naplan-window-closed-bg)",
            color: "var(--naplan-window-closed-fg)",
          }}
        >
          <p className="font-medium">Student opted out</p>
          {record.cohort_entry.opt_out_reason && (
            <p className="mt-1 text-sm">{record.cohort_entry.opt_out_reason}</p>
          )}
        </div>
      )}

      {!record.cohort_entry.is_opted_out && (
        <NaplanStudentResultsClient
          record={record}
          windowId={windowId}
          windowStatus={window.status}
          canManage={canManage}
        />
      )}
    </div>
  );
}
