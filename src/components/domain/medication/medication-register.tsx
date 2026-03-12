"use client";

// src/components/domain/medication/medication-register.tsx
//
// ============================================================
// Medication Register - filterable, paginated administration log
// ============================================================

import type { MedicationAdministrationWithDetails } from "@/types/domain";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback } from "react";

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  administrations: MedicationAdministrationWithDetails[];
  total: number;
  currentPage: number;
  totalPages: number;
  students: StudentOption[];
  initialFilters: {
    student_id: string;
    medication: string;
    from: string;
    to: string;
  };
}

export function MedicationRegister({
  administrations,
  total,
  currentPage,
  totalPages,
  students,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [studentId, setStudentId] = useState(initialFilters.student_id);
  const [medication, setMedication] = useState(initialFilters.medication);
  const [fromDate, setFromDate] = useState(initialFilters.from);
  const [toDate, setToDate] = useState(initialFilters.to);

  const applyFilters = useCallback(
    (page: number = 1) => {
      const params = new URLSearchParams();
      if (studentId) params.set("student_id", studentId);
      if (medication) params.set("medication", medication);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (page > 1) params.set("page", String(page));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, studentId, medication, fromDate, toDate],
  );

  const clearFilters = () => {
    setStudentId("");
    setMedication("");
    setFromDate("");
    setToDate("");
    router.push(pathname);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
          style={{ color: "var(--foreground)" }}
        >
          <option value="">All students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={medication}
          onChange={(e) => setMedication(e.target.value)}
          placeholder="Medication name"
          className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
          style={{ color: "var(--foreground)", minWidth: 140 }}
        />

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
          style={{ color: "var(--foreground)" }}
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
          style={{ color: "var(--foreground)" }}
        />

        <button
          onClick={() => applyFilters(1)}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Filter
        </button>

        {(studentId || medication || fromDate || toDate) && (
          <button
            onClick={clearFilters}
            className="touch-target rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            style={{ color: "var(--muted-foreground)" }}
          >
            Clear
          </button>
        )}

        <p
          className="ml-auto self-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {total} record{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      {administrations.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-12 text-center"
          style={{ background: "var(--background)" }}
        >
          <svg
            className="mx-auto h-10 w-10"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p
            className="mt-3 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No administration records
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {studentId || medication || fromDate || toDate
              ? "Try adjusting your filters."
              : "Dose records will appear here once medication has been administered."}
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border"
          style={{ background: "var(--background)" }}
        >
          <div className="overflow-x-auto scroll-native">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--muted)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Date/Time
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Student
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Medication
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Dose
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Route
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Administered By
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Witness
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Parent
                  </th>
                </tr>
              </thead>
              <tbody>
                {administrations.map((admin, i) => (
                  <tr
                    key={admin.id}
                    style={{
                      borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {new Date(admin.administered_at).toLocaleString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/medication/student/${admin.student.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {admin.student.first_name} {admin.student.last_name}
                      </Link>
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {admin.medication_name}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--foreground)" }}
                    >
                      {admin.dose_given}
                    </td>
                    <td
                      className="px-4 py-3 capitalize"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {admin.route}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      style={{ color: "var(--foreground)" }}
                    >
                      {admin.administrator.first_name}{" "}
                      {admin.administrator.last_name}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {admin.witness
                        ? `${admin.witness.first_name} ${admin.witness.last_name}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {admin.parent_notified ? (
                        <span style={{ color: "var(--attendance-present)" }}>
                          Yes
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted-foreground)" }}>
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => applyFilters(currentPage - 1)}
            disabled={currentPage <= 1}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            style={{ color: "var(--foreground)" }}
          >
            Previous
          </button>
          <span
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => applyFilters(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            style={{ color: "var(--foreground)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
