// src/app/(app)/parent/[studentId]/reports/page.tsx
//
// ============================================================
// WattleOS V2 - Child Reports List (Parent View)
// ============================================================
// Server Component. Shows published reports for a child.
// Clicking a report opens the read-only report viewer.
// ============================================================

import { getTenantContext } from '@/lib/auth/tenant-context';
import {
  isGuardianOf,
  getMyChildren,
  getChildReports,
} from '@/lib/actions/parent';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ studentId: string }>;
}

export default async function ChildReportsPage({ params }: PageProps) {
  const { studentId } = await params;
  await getTenantContext();

  const isGuardian = await isGuardianOf(studentId);
  if (!isGuardian) redirect('/parent');

  const childrenResult = await getMyChildren();
  const child = (childrenResult.data ?? []).find((c) => c.id === studentId);
  if (!child) redirect('/parent');
  const displayName = child.preferredName ?? child.firstName;

  const reportsResult = await getChildReports(studentId);
  const reports = reportsResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/parent" className="hover:text-gray-700">
            My Children
          </Link>
          <span className="text-gray-400">/</span>
          <Link href={`/parent/${studentId}`} className="hover:text-gray-700">
            {displayName} {child.lastName}
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">Reports</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {displayName}&apos;s Reports
        </h1>

        {/* Sub-nav */}
        <div className="mt-4 flex gap-4 border-b border-gray-200">
          <Link
            href={`/parent/${studentId}`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Portfolio
          </Link>
          <Link
            href={`/parent/${studentId}/attendance`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Attendance
          </Link>
          <Link
            href={`/parent/${studentId}/reports`}
            className="border-b-2 border-amber-500 px-1 pb-3 text-sm font-medium text-amber-700"
          >
            Reports
          </Link>
        </div>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            No published reports yet. Reports will appear here once your child&apos;s
            teacher completes and publishes them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/parent/${studentId}/reports/${report.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {report.term ?? 'Report'}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    {report.templateName && <span>{report.templateName}</span>}
                    <span>&middot;</span>
                    <span>By {report.authorName}</span>
                    {report.publishedAt && (
                      <>
                        <span>&middot;</span>
                        <span>
                          Published{' '}
                          {new Date(report.publishedAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
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