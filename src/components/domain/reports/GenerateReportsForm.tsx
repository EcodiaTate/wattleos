// src/components/domain/reports/GenerateReportsForm.tsx
//
// ============================================================
// WattleOS V2 - Generate Reports Form (Client Component)
// ============================================================
// Multi-step form for generating student reports:
//   1. Pick a template
//   2. Pick a class (loads students) or select individual students
//   3. Set term label and reporting period dates
//   4. Generate → shows results → link to reports list
//
// WHY client: Multi-step form with dynamic student loading
// requires client-side state management.
// ============================================================

"use client";

import { bulkGenerateReports } from "@/lib/actions/reports";
import { listStudents } from "@/lib/actions/sis";
import type { Student } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TemplateOption {
  id: string;
  name: string;
  cycleLevel: string | null;
  sectionCount: number;
}

interface ClassOption {
  id: string;
  name: string;
  cycleLevel: string | null;
  studentCount: number;
}

interface GenerateReportsFormProps {
  templates: TemplateOption[];
  classes: ClassOption[];
}

interface GenerationResult {
  generated: number;
  skipped: number;
  errors: string[];
}

export function GenerateReportsForm({
  templates,
  classes,
}: GenerateReportsFormProps) {
  // ── Form state ──────────────────────────────────────────
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState<
    Pick<
      Student,
      "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
    >[]
  >([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [term, setTerm] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // ── UI state ────────────────────────────────────────────
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // ── Load students when class changes ────────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentIds(new Set());
      return;
    }

    async function loadStudents() {
      setIsLoadingStudents(true);
      const result = await listStudents({
        class_id: selectedClassId,
        per_page: 100,
        enrollment_status: "active",
      });
      const studentList = (result.data ?? []).map((s) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        preferred_name: s.preferred_name,
        photo_url: s.photo_url,
      }));
      setStudents(studentList);
      // Select all by default
      setSelectedStudentIds(new Set(studentList.map((s) => s.id)));
      setIsLoadingStudents(false);
    }

    loadStudents();
  }, [selectedClassId]);

  // ── Helpers ─────────────────────────────────────────────
  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  function toggleAllStudents() {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  }

  const isValid =
    selectedTemplateId &&
    selectedStudentIds.size > 0 &&
    term.trim() &&
    periodStart &&
    periodEnd;

  // ── Generate ────────────────────────────────────────────
  async function handleGenerate() {
    if (!isValid) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    const res = await bulkGenerateReports({
      studentIds: Array.from(selectedStudentIds),
      templateId: selectedTemplateId,
      term: term.trim(),
      periodStart,
      periodEnd,
    });

    if (res.error) {
      setError(res.error.message);
    } else if (res.data) {
      setResult(res.data);
    }

    setIsGenerating(false);
  }

  // ── Result screen ───────────────────────────────────────
  if (result) {
    return (
      <div className="rounded-lg borderborder-border bg-background p-8">
        <div className="mx-auto max-w-md text-center">
          {result.generated > 0 ? (
            <div className="mb-4 flex h-[var(--density-button-height)] w-12 mx-auto items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
          ) : (
            <div className="mb-4 flex h-[var(--density-button-height)] w-12 mx-auto items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
          )}

          <h2 className="text-lg font-semibold text-foreground">
            Generation Complete
          </h2>

          <div className="mt-4 space-y-2 text-sm">
            {result.generated > 0 && (
              <p className="text-green-700">
                ✓ {result.generated} report{result.generated !== 1 ? "s" : ""}{" "}
                generated
              </p>
            )}
            {result.skipped > 0 && (
              <p className="text-amber-700">
                ⊘ {result.skipped} skipped (already exist for this term)
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="text-left">
                <p className="font-medium text-red-700">
                  ✕ {result.errors.length} error
                  {result.errors.length !== 1 ? "s" : ""}:
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-red-600">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>...and {result.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                setResult(null);
                setSelectedStudentIds(new Set());
              }}
              className="rounded-md border border-gray-300 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              Generate More
            </button>
            <button
              onClick={() =>
                router.push(`/reports?term=${encodeURIComponent(term)}`)
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Step 1: Template */}
      <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-sm font-semibold text-foreground">
          1. Choose a Template
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The template determines what sections appear in each report.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`rounded-md border p-3 text-left transition-all ${
                selectedTemplateId === t.id
                  ? "border-primary bg-amber-50 ring-1 ring-primary"
                  : "border-border hover:border-gray-300 hover:bg-background"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{t.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {t.cycleLevel && <span>{t.cycleLevel}</span>}
                <span>{t.sectionCount} sections</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Students */}
      <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-sm font-semibold text-foreground">
          2. Select Students
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a class to load its students, then select which ones to generate
          reports for.
        </p>

        {/* Class picker */}
        <div className="mt-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select a class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.cycleLevel ? ` (${c.cycleLevel})` : ""} - {c.studentCount}{" "}
                student{c.studentCount !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Student list */}
        {isLoadingStudents && (
          <div className="mt-4 text-sm text-muted-foreground">
            Loading students...
          </div>
        )}

        {!isLoadingStudents && students.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={toggleAllStudents}
                className="text-xs font-medium text-primary hover:text-amber-700"
              >
                {selectedStudentIds.size === students.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedStudentIds.size} of {students.length} selected
              </span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all ${
                      isSelected
                        ? "border-amber-300 bg-amber-50"
                        : "border-border text-muted-foreground hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </div>
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                        {student.first_name?.[0]}
                        {student.last_name?.[0]}
                      </div>
                    )}
                    <span
                      className={`truncate ${isSelected ? "text-foreground" : ""}`}
                    >
                      {student.preferred_name ?? student.first_name}{" "}
                      {student.last_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isLoadingStudents && selectedClassId && students.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No active students in this class.
          </p>
        )}
      </div>

      {/* Step 3: Term & Period */}
      <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-sm font-semibold text-foreground">
          3. Reporting Period
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Set the term label and date range. Auto-populated data (attendance,
          observations) will be pulled from this period.
        </p>
        <div className="mt-3 grid gap-[var(--density-card-padding)] sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Term Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g., Term 1 2026"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Period Start <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Period End <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generate button */}
      <div className="flex items-center justify-between rounded-lg borderborder-border bg-background px-5 py-4">
        <div className="text-sm text-muted-foreground">
          {selectedStudentIds.size > 0 ? (
            <>
              Ready to generate{" "}
              <span className="font-medium text-foreground">
                {selectedStudentIds.size}
              </span>{" "}
              report{selectedStudentIds.size !== 1 ? "s" : ""}
              {selectedTemplateId && (
                <>
                  {" "}
                  using{" "}
                  <span className="font-medium text-foreground">
                    {templates.find((t) => t.id === selectedTemplateId)?.name}
                  </span>
                </>
              )}
            </>
          ) : (
            "Select a template and students to continue"
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {isGenerating
            ? `Generating ${selectedStudentIds.size} report${selectedStudentIds.size !== 1 ? "s" : ""}...`
            : `Generate ${selectedStudentIds.size} Report${selectedStudentIds.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
