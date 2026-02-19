// src/components/domain/sis/EnrollStudentForm.tsx
//
// ============================================================
// WattleOS V2 - Enroll Student Form
// ============================================================
// 'use client' - search for a student, pick start date, enroll.
//
// Why client-side search: The student picker needs to be
// interactive with debounced search. We call the listStudents
// server action directly from the client - no API route needed.
// ============================================================

"use client";

import { enrollStudent } from "@/lib/actions/enrollments";
import { listStudents } from "@/lib/actions/students";
import { calculateAge, formatStudentName } from "@/lib/utils";
import type { Student } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

// ── Props ───────────────────────────────────────────────────

interface EnrollStudentFormProps {
  classId: string;
  className: string;
}

// ── Component ───────────────────────────────────────────────

export function EnrollStudentForm({
  classId,
  className,
}: EnrollStudentFormProps) {
  const router = useRouter();

  // ── Search state ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Selection state ─────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // ── Submission state ────────────────────────────────────
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Search handler ──────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    const result = await listStudents({
      search: searchQuery.trim(),
      per_page: 10,
      enrollment_status: "active",
    });

    if (result.data) {
      setSearchResults(result.data);
    }

    setIsSearching(false);
  }, [searchQuery]);

  // ── Enroll handler ──────────────────────────────────────
  async function handleEnroll() {
    if (!selectedStudent) return;

    setIsEnrolling(true);
    setError(null);

    const result = await enrollStudent({
      student_id: selectedStudent.id,
      class_id: classId,
      start_date: startDate,
    });

    if (result.error) {
      setError(result.error.message);
      setIsEnrolling(false);
      return;
    }

    // Success - redirect back to class detail
    router.push(`/classes/${classId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 p-[var(--density-card-padding)]">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Step 1: Search for a student ─────────────────── */}
      <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          1. Find Student
        </h2>

        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search by name..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Search results */}
        {hasSearched && (
          <div className="mt-4">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active students found matching &quot;{searchQuery}&quot;.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg borderborder-border">
                {searchResults.map((student) => {
                  const displayName = formatStudentName(
                    student.first_name,
                    student.last_name,
                    student.preferred_name,
                  );
                  const age = calculateAge(student.dob);
                  const isSelected = selectedStudent?.id === student.id;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-amber-50 ring-1 ring-inset ring-amber-200"
                          : "hover:bg-background"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                        {student.first_name[0]}
                        {student.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {displayName}
                        </p>
                        {age !== null && (
                          <p className="text-xs text-muted-foreground">
                            Age {age}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <svg
                          className="h-5 w-5 text-primary"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2: Set enrollment date ──────────────────── */}
      {selectedStudent && (
        <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            2. Set Start Date
          </h2>

          <div className="flex items-end gap-[var(--density-card-padding)]">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-foreground"
              >
                Enrollment Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">
                {formatStudentName(
                  selectedStudent.first_name,
                  selectedStudent.last_name,
                  selectedStudent.preferred_name,
                )}
              </span>{" "}
              → <span className="font-medium">{className}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={`/classes/${classId}`}
          className="rounded-lg border border-gray-300 bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Cancel
        </Link>
        <button
          onClick={handleEnroll}
          disabled={!selectedStudent || isEnrolling}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnrolling ? "Enrolling..." : "Enroll Student"}
        </button>
      </div>
    </div>
  );
}
