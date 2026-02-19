// src/app/(app)/parent/[studentId]/attendance/page.tsx
//
// ============================================================
// WattleOS V2 - Child Attendance Page (Parent View)
// ============================================================
// Server Component. Shows attendance records for a child with
// summary stats and date range filtering.
// ============================================================

import { getTenantContext } from '@/lib/auth/tenant-context';
import {
  isGuardianOf,
  getMyChildren,
  getChildAttendance,
} from '@/lib/actions/parent';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  present: { bg: 'bg-green-100', text: 'text-green-700', label: 'Present' },
  absent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Absent' },
  late: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Late' },
  excused: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Excused' },
  half_day: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Half Day' },
};

export default async function ChildAttendancePage({
  params,
  searchParams,
}: PageProps) {
  const { studentId } = await params;
  const query = await searchParams;
  await getTenantContext();

  const isGuardian = await isGuardianOf(studentId);
  if (!isGuardian) redirect('/parent');

  const childrenResult = await getMyChildren();
  const child = (childrenResult.data ?? []).find((c) => c.id === studentId);
  if (!child) redirect('/parent');
  const displayName = child.preferredName ?? child.firstName;

  const result = await getChildAttendance(studentId, {
    startDate: query.start || undefined,
    endDate: query.end || undefined,
  });

  const records = result.data?.records ?? [];
  const summary = result.data?.summary ?? {
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    halfDay: 0,
    attendanceRate: 0,
  };

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
          <span className="text-gray-900">Attendance</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {displayName}&apos;s Attendance
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
            className="border-b-2 border-amber-500 px-1 pb-3 text-sm font-medium text-amber-700"
          >
            Attendance
          </Link>
          <Link
            href={`/parent/${studentId}/reports`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Reports
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Days" value={summary.totalDays} />
        <SummaryCard label="Present" value={summary.present} color="green" />
        <SummaryCard label="Absent" value={summary.absent} color="red" />
        <SummaryCard label="Late" value={summary.late} color="amber" />
        <SummaryCard label="Excused" value={summary.excused} color="blue" />
        <SummaryCard label="Attendance Rate" value={`${summary.attendanceRate}%`} color="green" large />
      </div>

      {/* Records table */}
      {records.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No attendance records found for this period.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Check In
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Check Out
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => {
                const style = STATUS_STYLES[record.status] ?? STATUS_STYLES.present;
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {record.checkInAt ? formatTime(record.checkInAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {record.checkOutAt ? formatTime(record.checkOutAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.notes ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SummaryCard({
  label,
  value,
  color,
  large,
}: {
  label: string;
  value: number | string;
  color?: 'green' | 'red' | 'amber' | 'blue';
  large?: boolean;
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
      <p className={`${large ? 'text-2xl' : 'text-xl'} font-bold ${color ? colorMap[color] : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}