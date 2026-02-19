// src/app/(app)/parent/[studentId]/reports/page.tsx
//
// ============================================================
// WattleOS V2 - Child Reports List (Parent View)
// ============================================================
// Server Component. Shows published reports for a child.
// Clicking a report opens the read-only report viewer.
// ============================================================

import {
  getChildReports,
  getMyChildren,
  isGuardianOf,
} from "@/lib/actions/parent";
import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ studentId: string }>;
}

export default async function ChildReportsPage({ params }: PageProps) {
  const { studentId } = await params;
  await getTenantContext();

  const isGuardian = await isGuardianOf(studentId);
  if (!isGuardian) redirect("/parent");

  const childrenResult = await getMyChildren();
  const child = (childrenResult.data ?? []).find((c) => c.id === studentId);
  if (!child) redirect("/parent");
  const displayName = child.preferredName ?? child.firstName;

  const reportsResult = await getChildReports(studentId);
  const reports = reportsResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/parent" className="hover:text-foreground">
            My Children
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={`/parent/${studentId}`} className="hover:text-foreground">
            {displayName} {child.lastName}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">Reports</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {displayName}&apos;s Reports
        </h1>

        {/* Sub-nav */}
        <div className="mt-4 flex gap-[var(--density-card-padding)] border-bborder-border">
          <Link
            href={`/parent/${studentId}`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Portfolio
          </Link>
          <Link
            href={`/parent/${studentId}/attendance`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Attendance
          </Link>
          <Link
            href={`/parent/${studentId}/reports`}
            className="border-b-2 border-primary px-1 pb-3 text-sm font-medium text-amber-700"
          >
            Reports
          </Link>
        </div>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No published reports yet. Reports will appear here once your
            child&apos;s teacher completes and publishes them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/parent/${studentId}/reports/${report.id}`}
              className="block rounded-lg borderborder-border bg-background p-[var(--density-card-padding)] transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.term ?? "Report"}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {report.templateName && <span>{report.templateName}</span>}
                    <span>&middot;</span>
                    <span>By {report.authorName}</span>
                    {report.publishedAt && (
                      <>
                        <span>&middot;</span>
                        <span>
                          Published{" "}
                          {new Date(report.publishedAt).toLocaleDateString(
                            "en-AU",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
