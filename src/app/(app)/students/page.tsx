// src/app/(app)/students/page.tsx
//
// ============================================================
// WattleOS V2 - Student List Page
// ============================================================
// Server Component. Fetches students with filters and renders
// a searchable, paginated list. No 'use client' needed here.
//
// Fix: Removed `params.tenant` - the (app) route group has no
// (app) dynamic segment. All links now use absolute paths
// without a tenant prefix (e.g., /students, /students/[id]).
// Tenant isolation is handled by RLS + JWT, not URL segments.
// ============================================================

import { StudentSearchBar } from "@/components/domain/students/StudentSearchBar";
import { listStudents } from "@/lib/actions/students";
import { ENROLLMENT_STATUSES } from "@/lib/constants";
import {
  calculateAge,
  enrollmentStatusColor,
  formatDate,
  formatStudentName,
} from "@/lib/utils";
import { EnrollmentStatus } from "@/types/domain";
import Link from "next/link";

interface StudentListPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    class_id?: string;
  }>;
}

export default async function StudentListPage({
  searchParams,
}: StudentListPageProps) {
  const search = await searchParams;

  const result = await listStudents({
    page: Number(search.page) || 1,
    per_page: 20,
    search: search.search,
    enrollment_status: search.status as EnrollmentStatus | undefined,
    class_id: search.class_id,
  });

  const students = result.data;
  const pagination = result.pagination;

  // Helper to build query strings for filter/pagination links
  function buildQuery(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = {
      search: search.search,
      status: search.status,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pagination.total} student{pagination.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/students/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          + Add Student
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-[var(--density-card-padding)] sm:flex-row sm:items-center">
        <StudentSearchBar defaultValue={search.search ?? ""} />

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <Link
            href="/students"
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
              !search.status
                ? "bg-indigo-100 text-indigo-700"
                : "bg-muted text-muted-foreground hover:bg-gray-200"
            }`}
          >
            All
          </Link>
          {ENROLLMENT_STATUSES.map((s) => (
            <Link
              key={s.value}
              href={`/students${buildQuery({ status: s.value, page: undefined })}`}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                search.status === s.value
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-muted text-muted-foreground hover:bg-gray-200"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Student Table */}
      {result.error ? (
        <div className="rounded-md bg-red-50 p-[var(--density-card-padding)]">
          <p className="text-sm text-red-700">{result.error.message}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search.search || search.status
              ? "No students match your filters."
              : "No students yet. Add your first student to get started."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg borderborder-border bg-background shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Added
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-background">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-background">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-[var(--density-button-height)] w-10 flex-shrink-0">
                        {student.photo_url ? (
                          <img
                            className="h-[var(--density-button-height)] w-10 rounded-full object-cover"
                            src={student.photo_url}
                            alt=""
                          />
                        ) : (
                          <div className="flex h-[var(--density-button-height)] w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
                            {student.first_name[0]}
                            {student.last_name[0]}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {formatStudentName(
                            student.first_name,
                            student.last_name,
                            student.preferred_name,
                          )}
                        </div>
                        {student.preferred_name && (
                          <div className="text-xs text-muted-foreground">
                            Legal: {student.first_name} {student.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {calculateAge(student.dob) !== null
                      ? `${calculateAge(student.dob)} yrs`
                      : " - "}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${enrollmentStatusColor(student.enrollment_status)}`}
                    >
                      {student.enrollment_status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(student.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <nav className="flex items-center justify-between border-tborder-border bg-background px-4 py-3 sm:px-6">
              <div className="hidden sm:block">
                <p className="text-sm text-foreground">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.per_page + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      pagination.page * pagination.per_page,
                      pagination.total,
                    )}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span>{" "}
                  results
                </p>
              </div>
              <div className="flex flex-1 justify-between sm:justify-end gap-2">
                {pagination.page > 1 && (
                  <Link
                    href={`/students${buildQuery({ page: String(pagination.page - 1) })}`}
                    className="rounded-md border border-gray-300 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
                  >
                    Previous
                  </Link>
                )}
                {pagination.page < pagination.total_pages && (
                  <Link
                    href={`/students${buildQuery({ page: String(pagination.page + 1) })}`}
                    className="rounded-md border border-gray-300 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
                  >
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
