// src/app/(app)/programs/page.tsx
//
// ============================================================
// WattleOS V2 - Programs List Page
// ============================================================
// Server Component. Displays all extended-day, OSHC, and
// extracurricular programs for the tenant. Staff can filter
// by type and active status, and navigate to create/edit.
//
// WHY server component: The list data is a straightforward
// query with no client-side interactivity beyond links and
// the filter dropdown (handled by a small client island).
// ============================================================

import { ProgramListFilters } from "@/components/domain/programs/program-list-filters";
import { ProgramTypeBadge } from "@/components/domain/programs/program-type-badge";
import { listPrograms } from "@/lib/actions/programs/programs";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  formatCents,
  formatTime,
  type ProgramTypeValue,
} from "@/lib/constants/programs";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ProgramsPageProps {
  searchParams: Promise<{
    type?: string;
    active?: string;
    page?: string;
  }>;
}

export default async function ProgramsPage({
  searchParams,
}: ProgramsPageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_PROGRAMS)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const typeFilter = params.type as ProgramTypeValue | undefined;
  const activeFilter =
    params.active === "true"
      ? true
      : params.active === "false"
        ? false
        : undefined;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const result = await listPrograms({
    program_type: typeFilter,
    is_active: activeFilter,
    page,
    per_page: 25,
  });

  const programs = result.data ?? [];
  const totalPages = result.pagination
    ? Math.ceil(result.pagination.total / result.pagination.per_page)
    : 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Programs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage OSHC, extracurricular, and extended-day programs.
          </p>
        </div>
        <Link
          href="/programs/new"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
        >
          + New Program
        </Link>
      </div>

      {/* Filters */}
      <ProgramListFilters
        currentType={typeFilter}
        currentActive={activeFilter}
      />

      {/* Programs Table */}
      {programs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            {typeFilter || activeFilter !== undefined
              ? "No programs match your filters."
              : "No programs yet. Create your first program to get started."}
          </p>
          {!typeFilter && activeFilter === undefined && (
            <Link
              href="/programs/new"
              className="mt-3 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              Create a program →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Program
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Schedule
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Capacity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Sessions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  This Week
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {programs.map((program) => {
                const daysDisplay =
                  program.default_days.length > 0
                    ? program.default_days
                        .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                        .join(", ")
                    : "—";

                const timeDisplay =
                  program.default_start_time && program.default_end_time
                    ? `${formatTime(program.default_start_time)}–${formatTime(program.default_end_time)}`
                    : "—";

                return (
                  <tr
                    key={program.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/programs/${program.id}`} className="block">
                        <div className="text-sm font-medium text-gray-900 hover:text-amber-700">
                          {program.name}
                        </div>
                        {program.code && (
                          <div className="text-xs text-gray-400">
                            {program.code}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ProgramTypeBadge
                        type={program.program_type as ProgramTypeValue}
                        showIcon
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{daysDisplay}</div>
                      <div className="text-xs text-gray-400">{timeDisplay}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {program.max_capacity ?? "∞"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {formatCents(program.session_fee_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {program.upcoming_session_count}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {program.total_bookings_this_week}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {program.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/programs?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ""}${activeFilter !== undefined ? `&active=${activeFilter}` : ""}`}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/programs?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ""}${activeFilter !== undefined ? `&active=${activeFilter}` : ""}`}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-4 text-sm">
        <Link
          href="/programs/calendar"
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          Session Calendar →
        </Link>
        <Link
          href="/programs/kiosk"
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          Kiosk Check-in →
        </Link>
        <Link
          href="/programs/reports"
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          Utilization Reports →
        </Link>
      </div>
    </div>
  );
}
