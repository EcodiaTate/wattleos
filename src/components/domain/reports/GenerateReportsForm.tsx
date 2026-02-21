// src/components/domain/reports/GenerateReportsForm.tsx
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

  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

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
      setSelectedStudentIds(new Set(studentList.map((s) => s.id)));
      setIsLoadingStudents(false);
    }

    loadStudents();
  }, [selectedClassId]);

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

  if (result) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 shadow-lg animate-scale-in">
        <div className="mx-auto max-w-md text-center">
          {result.generated > 0 ? (
            <div className="mb-6 flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-success/10 text-success">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          ) : (
            <div className="mb-6 flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-warning/10 text-warning">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
          )}

          <h2 className="text-2xl font-bold text-foreground">Generation Complete</h2>

          <div className="mt-6 space-y-3">
            {result.generated > 0 && (
              <p className="text-success font-semibold">
                ✓ {result.generated} report{result.generated !== 1 ? "s" : ""} generated
              </p>
            )}
            {result.skipped > 0 && (
              <p className="text-warning font-semibold">
                ⊘ {result.skipped} skipped (already exist for this term)
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="text-left bg-destructive/5 border border-destructive/10 p-4 rounded-lg mt-4">
                <p className="font-bold text-destructive text-sm mb-2">
                  ✕ {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                </p>
                <ul className="list-inside list-disc text-xs text-destructive/80 space-y-1">
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

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => {
                setResult(null);
                setSelectedStudentIds(new Set());
              }}
              className="rounded-lg border border-border bg-background px-6 h-[var(--density-button-height)] text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-95"
            >
              Generate More
            </button>
            <button
              onClick={() =>
                router.push(`/reports?term=${encodeURIComponent(term)}`)
              }
              className="rounded-lg bg-primary px-6 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-600 active:scale-95"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--density-section-gap)]">
      {/* Step 1: Template */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span>
          Choose a Template
        </h2>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground ml-8">
          The template determines what sections appear in each report.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ml-8">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`rounded-lg border p-4 text-left transition-all card-interactive ${
                selectedTemplateId === t.id
                  ? "border-primary bg-primary-50/50 ring-2 ring-primary/20"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <p className={`text-sm font-bold ${selectedTemplateId === t.id ? 'text-primary-700' : 'text-foreground'}`}>{t.name}</p>
              <div className="mt-2 flex items-center gap-3">
                {t.cycleLevel && (
                  <span className="status-badge bg-muted text-muted-foreground status-badge-plain px-2 py-0">
                    {t.cycleLevel}
                  </span>
                )}
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                  {t.sectionCount} sections
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Students */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span>
          Select Students
        </h2>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground ml-8">
          Pick a class to load its students, then select which ones to generate reports for.
        </p>

        <div className="mt-5 ml-8">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm font-medium shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="">Select a class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.cycleLevel ? ` (${c.cycleLevel})` : ""} - {c.studentCount} student{c.studentCount !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {isLoadingStudents && (
          <div className="mt-6 ml-8 flex items-center gap-3 text-sm text-muted-foreground font-medium animate-pulse-soft">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Loading students...
          </div>
        )}

        {!isLoadingStudents && students.length > 0 && (
          <div className="mt-6 ml-8">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={toggleAllStudents}
                className="text-xs font-bold text-primary hover:text-primary-600 transition-colors"
              >
                {selectedStudentIds.size === students.length ? "Deselect All" : "Select All Students"}
              </button>
              <span className="status-badge bg-muted text-muted-foreground status-badge-plain">
                {selectedStudentIds.size} of {students.length} selected
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary-300 bg-primary-50/30"
                        : "border-border bg-card text-muted-foreground hover:border-primary-200"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-border shadow-sm"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                    )}
                    <span className={`truncate text-sm font-bold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {student.preferred_name ?? student.first_name} {student.last_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isLoadingStudents && selectedClassId && students.length === 0 && (
          <p className="mt-6 ml-8 text-sm text-muted-foreground italic font-medium">
            No active students found in this class.
          </p>
        )}
      </div>

      {/* Step 3: Term & Period */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span>
          Reporting Period
        </h2>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground ml-8">
          Set the term label and date range. Data will be auto-populated from this period.
        </p>
        <div className="mt-6 ml-8 grid gap-5 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Term Label <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g., Term 1 2026"
              className="mt-1.5 block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Period Start <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Period End <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="animate-slide-down rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-bold">
          {error}
        </div>
      )}

      {/* Generate button footer */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-primary-100 bg-primary-50/80 backdrop-blur-sm px-6 py-5 shadow-lg">
        <div className="text-sm font-medium text-primary-900">
          {selectedStudentIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {selectedStudentIds.size}
              </span>
              <span>
                Report{selectedStudentIds.size !== 1 ? "s" : ""} ready to generate
                {selectedTemplateId && (
                  <> using <span className="font-bold underline decoration-primary/30 underline-offset-2">{templates.find((t) => t.id === selectedTemplateId)?.name}</span></>
                )}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground italic">Select a template and students to continue</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className="rounded-lg bg-primary px-8 h-11 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-95"
        >
          {isGenerating
            ? `Generating ${selectedStudentIds.size} reports...`
            : `Generate ${selectedStudentIds.size} Report${selectedStudentIds.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}