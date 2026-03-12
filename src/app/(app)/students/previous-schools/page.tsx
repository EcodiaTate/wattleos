// src/app/(app)/students/previous-schools/page.tsx
//
// ============================================================
// WattleOS V2 - Previous School Records (All Students)
// ============================================================
// Admin overview: lists every student who has previous school
// records on file, with quick links to each student's detail.
// ============================================================

import { listPreviousSchoolRecords } from "@/lib/actions/previous-school-records";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { formatStudentName } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export const metadata = { title: "Previous Schools - WattleOS" };

export default async function PreviousSchoolsOverviewPage({
  searchParams,
}: PageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS)) {
    redirect("/dashboard");
  }

  const { page: pageStr, search } = await searchParams;
  const page = parseInt(pageStr ?? "1", 10) || 1;

  const result = await listPreviousSchoolRecords({ page, perPage: 25, search });
  const records = result.data ?? [];
  const pagination = result.pagination;

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS,
  );

  return (
    <div className="space-y-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Previous Schools
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Prior school history across all students
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search school name…"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Search
        </button>
      </form>

      {/* Results */}
      {records.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center">
          <p className="text-2xl" style={{ color: "var(--empty-state-icon)" }}>
            🏫
          </p>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {search
              ? "No records match that search"
              : "No previous school records on file"}
          </p>
          {!search && (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Open a student profile and navigate to Previous Schools to add
              records
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b border-border"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Student
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  School
                </th>
                <th
                  className="hidden px-4 py-3 text-left text-xs font-medium sm:table-cell"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Location
                </th>
                <th
                  className="hidden px-4 py-3 text-left text-xs font-medium md:table-cell"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Dates
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => {
                const studentName = formatStudentName(
                  r.student.first_name,
                  r.student.last_name,
                );
                const location = [r.suburb, r.state].filter(Boolean).join(", ");
                const dateRange = [r.start_date, r.end_date]
                  .filter(Boolean)
                  .map((d) =>
                    new Date(d! + "T00:00:00").toLocaleDateString("en-AU", {
                      month: "short",
                      year: "numeric",
                    }),
                  )
                  .join(" – ");

                return (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-muted/40"
                    style={{ backgroundColor: "var(--card)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${r.student_id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {studentName}
                      </Link>
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--foreground)" }}
                    >
                      {r.school_name}
                      {r.school_type && (
                        <span
                          className="ml-2 rounded-full px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: "var(--accent)",
                            color: "var(--accent-foreground)",
                          }}
                        >
                          {r.school_type}
                        </span>
                      )}
                    </td>
                    <td
                      className="hidden px-4 py-3 sm:table-cell"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {location || "-"}
                    </td>
                    <td
                      className="hidden px-4 py-3 md:table-cell"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {dateRange || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/students/${r.student_id}/previous-schools`}
                        className="text-xs hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {canManage ? "Edit" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.per_page && (
        <div
          className="flex items-center justify-between text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>
            {pagination.total} record{pagination.total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className="rounded-lg border border-border px-3 py-1.5"
                style={{ color: "var(--foreground)" }}
              >
                ← Prev
              </Link>
            )}
            {page * pagination.per_page < pagination.total && (
              <Link
                href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className="rounded-lg border border-border px-3 py-1.5"
                style={{ color: "var(--foreground)" }}
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
