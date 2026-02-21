// src/app/(app)/programs/page.tsx

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
    <div className="content-grid animate-fade-in space-y-[var(--density-section-gap)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Programs</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage OSHC, extracurricular, and extended-day programs.
          </p>
        </div>
        <Link
          href="/programs/new"
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-all shadow-[var(--shadow-primary)]"
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
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border-strong)] p-12 text-center bg-[var(--card)]">
          <p className="text-sm text-[var(--empty-state-fg)]">
            {typeFilter || activeFilter !== undefined
              ? "No programs match your filters."
              : "No programs yet. Create your first program to get started."}
          </p>
          {!typeFilter && activeFilter === undefined && (
            <Link
              href="/programs/new"
              className="mt-3 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Create a program →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--table-border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <table className="min-w-full">
            <thead className="bg-[var(--table-header-bg)] border-b border-[var(--table-border)]">
              <tr>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Program
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Type
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Schedule
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Capacity
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Fee
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Sessions
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  This Week
                </th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-center text-xs font-semibold uppercase tracking-wider text-[var(--table-header-fg)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--table-border)]">
              {programs.map((program) => {
                const daysDisplay =
                  program.default_days.length > 0
                    ? program.default_days
                        .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                        .join(", ")
                    : " - ";

                const timeDisplay =
                  program.default_start_time && program.default_end_time
                    ? `${formatTime(program.default_start_time)}–${formatTime(program.default_end_time)}`
                    : " - ";

                return (
                  <tr
                    key={program.id}
                    className="hover:bg-[var(--table-row-hover)] transition-colors group"
                  >
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
                      <Link href={`/programs/${program.id}`} className="block">
                        <div className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {program.name}
                        </div>
                        {program.code && (
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {program.code}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
                      <ProgramTypeBadge
                        type={program.program_type as ProgramTypeValue}
                        showIcon
                      />
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
                      <div className="text-sm text-[var(--foreground)]">{daysDisplay}</div>
                      <div className="text-xs text-[var(--muted-foreground)] tabular-nums">{timeDisplay}</div>
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm text-[var(--foreground)] tabular-nums">
                      {program.max_capacity ?? "∞"}
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm text-[var(--foreground)] tabular-nums">
                      {formatCents(program.session_fee_cents)}
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm text-[var(--foreground)] tabular-nums">
                      {program.upcoming_session_count}
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm text-[var(--foreground)] tabular-nums">
                      {program.total_bookings_this_week}
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-center">
                      {program.is_active ? (
                        <span 
                          className="status-badge"
                          style={{ '--badge-bg': 'var(--success)', '--badge-fg': 'var(--success-foreground)' } as React.CSSProperties}
                        >
                          Active
                        </span>
                      ) : (
                        <span 
                          className="status-badge"
                          style={{ '--badge-bg': 'var(--badge-neutral-bg)', '--badge-fg': 'var(--badge-neutral-fg)' } as React.CSSProperties}
                        >
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
            <div className="flex items-center justify-between border-t border-[var(--table-border)] bg-[var(--table-header-bg)] px-[var(--density-card-padding)] py-[var(--density-sm)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                Page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/programs?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ""}${activeFilter !== undefined ? `&active=${activeFilter}` : ""}`}
                    className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-overlay)] transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/programs?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ""}${activeFilter !== undefined ? `&active=${activeFilter}` : ""}`}
                    className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-overlay)] transition-colors"
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
      <div className="flex flex-wrap gap-[var(--density-xl)] text-sm border-t border-[var(--border)] pt-[var(--density-lg)]">
        <Link
          href="/programs/calendar"
          className="text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
        >
          Session Calendar →
        </Link>
        <Link
          href="/programs/kiosk"
          className="text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
        >
          Kiosk Check-in →
        </Link>
        <Link
          href="/programs/reports"
          className="text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
        >
          Utilization Reports →
        </Link>
      </div>
    </div>
  );
}