"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { SickBayVisitWithStudent, SickBayVisitStatus, SickBayVisitType } from "@/types/domain";
import { listSickBayVisits } from "@/lib/actions/sick-bay";
import { SickBayStatusBadge } from "./sick-bay-status-badge";

interface VisitListClientProps {
  initialVisits: SickBayVisitWithStudent[];
  totalCount: number;
  page: number;
  perPage: number;
}

const VISIT_TYPES: Record<SickBayVisitType, string> = {
  injury: "Injury",
  illness: "Illness",
  medication_given: "Medication",
  first_aid: "First Aid",
  other: "Other",
};

const STATUSES: Record<SickBayVisitStatus, string> = {
  open: "Open",
  resolved: "Resolved",
  referred: "Referred",
};

export function VisitListClient({
  initialVisits,
  totalCount: initialTotal,
  page: initialPage,
  perPage,
}: VisitListClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [visits, setVisits] = useState(initialVisits);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [statusFilter, setStatusFilter] = useState<SickBayVisitStatus | "">("");
  const [visitTypeFilter, setVisitTypeFilter] = useState<SickBayVisitType | "">("");
  const [search, setSearch] = useState("");

  const totalPages = Math.ceil(totalCount / perPage);

  function handleFilterChange() {
    startTransition(async () => {
      const result = await listSickBayVisits({
        date_from: null,
        date_to: null,
        status: statusFilter || null,
        visit_type: visitTypeFilter || null,
        search: search || null,
        page: 1,
        perPage,
      });

      if (!result.error) {
        setVisits(result.data);
        setTotalCount(result.pagination.total);
        setPage(1);
        haptics.selection();
      }
    });
  }

  function handlePageChange(newPage: number) {
    startTransition(async () => {
      const result = await listSickBayVisits({
        date_from: null,
        date_to: null,
        status: statusFilter || null,
        visit_type: visitTypeFilter || null,
        search: search || null,
        page: newPage,
        perPage,
      });

      if (!result.error) {
        setVisits(result.data);
        setTotalCount(result.pagination.total);
        setPage(newPage);
        haptics.selection();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row">
        <input
          type="text"
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SickBayVisitStatus | "")}
          className="rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="referred">Referred</option>
        </select>
        <select
          value={visitTypeFilter}
          onChange={(e) => setVisitTypeFilter(e.target.value as SickBayVisitType | "")}
          className="rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All Types</option>
          <option value="injury">Injury</option>
          <option value="illness">Illness</option>
          <option value="medication_given">Medication</option>
          <option value="first_aid">First Aid</option>
          <option value="other">Other</option>
        </select>
        <button
          onClick={handleFilterChange}
          disabled={isPending}
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--secondary)",
            color: "var(--secondary-foreground)",
          }}
        >
          Filter
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl border border-border"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="scroll-native overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--muted)",
                }}
              >
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Student
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Type
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Date
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Parent
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    No visits found
                  </td>
                </tr>
              ) : (
                visits.map((visit) => (
                  <tr
                    key={visit.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <div style={{ color: "var(--foreground)" }} className="font-medium">
                        {visit.student.first_name} {visit.student.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {VISIT_TYPES[visit.visit_type]}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <SickBayStatusBadge status={visit.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      {visit.parent_notified ? (
                        <span style={{ color: "var(--primary)" }}>✓ Yes</span>
                      ) : (
                        <span style={{ color: "var(--muted-foreground)" }}>−</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/sick-bay/${visit.id}`}
                        className="text-sm font-medium"
                        style={{ color: "var(--primary)" }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p
          className="text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Page {page} of {totalPages} ({totalCount} total)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isPending}
            className="active-push touch-target rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{
              backgroundColor: "var(--secondary)",
              color: "var(--secondary-foreground)",
            }}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
            className="active-push touch-target rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{
              backgroundColor: "var(--secondary)",
              color: "var(--secondary-foreground)",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
