"use client";

// src/components/domain/reports/StudentsClient.tsx
//
// ============================================================
// WattleOS Report Builder - Students Client
// ============================================================
// Handles: add/edit/delete students, CSV import, class filter.
// All mutations call server actions + update local state.
// ============================================================

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  addReportBuilderStudent,
  updateReportBuilderStudent,
  deleteReportBuilderStudent,
  importStudentsFromCsv,
} from "@/lib/actions/reports/report-builder-students";
import type {
  ReportBuilderStudent,
  CsvStudentRow,
} from "@/lib/actions/reports/report-builder-students";

interface Props {
  initialStudents: ReportBuilderStudent[];
  studentCount: number;
  isFree: boolean;
  atLimit: boolean;
  freeLimit: number;
}

type ModalMode = "add" | "edit" | null;

export function StudentsClient({
  initialStudents,
  studentCount: initialCount,
  isFree,
  atLimit: initialAtLimit,
  freeLimit,
}: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [studentCount, setStudentCount] = useState(initialCount);
  const [atLimit, setAtLimit] = useState(initialAtLimit);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingStudent, setEditingStudent] =
    useState<ReportBuilderStudent | null>(null);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showCsvImport, setShowCsvImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive class labels from current students
  const classLabels = Array.from(
    new Set(students.map((s) => s.class_label).filter(Boolean)),
  ).sort();

  const filtered =
    filterClass === "all"
      ? students
      : students.filter((s) => s.class_label === filterClass);

  function openAdd() {
    setEditingStudent(null);
    setModalMode("add");
    setError(null);
  }

  function openEdit(student: ReportBuilderStudent) {
    setEditingStudent(student);
    setModalMode("edit");
    setError(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditingStudent(null);
    setError(null);
  }

  function handleSave(formData: {
    firstName: string;
    lastName: string;
    preferredName: string;
    classLabel: string;
  }) {
    setError(null);
    startTransition(async () => {
      if (modalMode === "add") {
        const result = await addReportBuilderStudent({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          preferred_name: formData.preferredName.trim() || undefined,
          class_label: formData.classLabel.trim(),
        });
        if (result.error) {
          setError(result.error.message);
          return;
        }
        if (result.data) {
          setStudents((prev) => [result.data!, ...prev]);
          const newCount = studentCount + 1;
          setStudentCount(newCount);
          setAtLimit(isFree && newCount >= freeLimit);
        }
      } else if (modalMode === "edit" && editingStudent) {
        const result = await updateReportBuilderStudent(editingStudent.id, {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          preferred_name: formData.preferredName.trim() || undefined,
          class_label: formData.classLabel.trim(),
        });
        if (result.error) {
          setError(result.error.message);
          return;
        }
        if (result.data) {
          setStudents((prev) =>
            prev.map((s) => (s.id === editingStudent.id ? result.data! : s)),
          );
        }
      }
      closeModal();
      setSuccess(modalMode === "add" ? "Student added." : "Student updated.");
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  function handleDelete(studentId: string, name: string) {
    if (
      !confirm(
        `Remove ${name}? This will also remove any draft reports for this student.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteReportBuilderStudent(studentId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      const newCount = Math.max(0, studentCount - 1);
      setStudentCount(newCount);
      setAtLimit(isFree && newCount >= freeLimit);
      setSuccess("Student removed.");
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  function parseCsv(text: string): CsvStudentRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    // Skip header row, map columns
    return lines.slice(1).flatMap((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const [first_name, last_name, class_label, preferred_name] = cols;
      if (!first_name || !last_name || !class_label) return [];
      return [
        {
          first_name,
          last_name,
          class_label,
          preferred_name: preferred_name || undefined,
        },
      ];
    });
  }

  function handleCsvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const csv = evt.target?.result as string;
      const rows = parseCsv(csv);
      if (!rows.length) {
        setError(
          "No valid rows found in CSV. Check that columns are: first_name, last_name, class_label.",
        );
        return;
      }
      startTransition(async () => {
        const result = await importStudentsFromCsv(rows);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        if (result.data) {
          const { imported, skipped_duplicate, skipped_limit } = result.data;
          const skipped = skipped_duplicate + skipped_limit;
          setSuccess(
            `Imported ${imported} students${skipped > 0 ? `, ${skipped} skipped (${skipped_duplicate} duplicate, ${skipped_limit} over limit)` : ""}.`,
          );
          setTimeout(() => {
            setSuccess(null);
            window.location.reload();
          }, 2000);
        }
        setShowCsvImport(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
            <span>/</span>
            <span className="text-foreground">Students</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {studentCount} student{studentCount !== 1 ? "s" : ""}
            {isFree && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: atLimit
                    ? "color-mix(in srgb, var(--color-warning, #d97706) 15%, transparent)"
                    : "var(--color-muted)",
                  color: atLimit
                    ? "var(--color-warning-fg, #92400e)"
                    : "var(--color-muted-foreground)",
                }}
              >
                {studentCount}/{freeLimit} free limit
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCsvImport((v) => !v)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={openAdd}
            disabled={atLimit}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            Add student
          </button>
        </div>
      </div>

      {/* Free limit upsell */}
      {atLimit && (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "var(--color-warning, #d97706)",
            background:
              "color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-warning-fg)" }}
          >
            You&apos;ve reached the {freeLimit}-student limit on the free plan
          </p>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--color-warning-fg)", opacity: 0.8 }}
          >
            Upgrade to Pro for unlimited students.
          </p>
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro%20-%20Student%20Limit"
            className="mt-2 inline-flex items-center text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Ask about Pro →
          </a>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-destructive) 10%, transparent)",
            color: "var(--color-destructive)",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-success, #22c55e) 10%, transparent)",
            color: "var(--color-success-fg, #15803d)",
          }}
        >
          {success}
        </div>
      )}

      {/* CSV import panel */}
      {showCsvImport && (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Import from CSV
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            CSV must have columns:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              first_name, last_name, class_label
            </code>
            . Optional:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              preferred_name
            </code>
            . First row is treated as a header and skipped.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvChange}
            disabled={isPending}
            className="block text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:cursor-pointer"
            style={{
              // @ts-expect-error -- custom property
              "--tw-file-bg": "var(--color-primary)",
            }}
          />
          <button
            type="button"
            onClick={() => setShowCsvImport(false)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Class filter */}
      {classLabels.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterClass("all")}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background:
                filterClass === "all"
                  ? "var(--color-primary)"
                  : "var(--color-muted)",
              color:
                filterClass === "all"
                  ? "var(--color-primary-foreground, #fff)"
                  : "var(--color-muted-foreground)",
            }}
          >
            All classes
          </button>
          {classLabels.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilterClass(label)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background:
                  filterClass === label
                    ? "var(--color-primary)"
                    : "var(--color-muted)",
                color:
                  filterClass === label
                    ? "var(--color-primary-foreground, #fff)"
                    : "var(--color-muted-foreground)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No students yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add students manually or import a CSV to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-muted)",
                }}
              >
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Class
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, i) => {
                const displayName = [
                  student.preferred_name ?? student.first_name,
                  student.last_name,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <tr
                    key={student.id}
                    style={{
                      borderTop:
                        i > 0 ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {displayName}
                      </p>
                      {student.preferred_name && (
                        <p className="text-xs text-muted-foreground">
                          {student.first_name} {student.last_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {student.class_label}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(student)}
                          className="text-xs font-medium transition-opacity hover:opacity-70"
                          style={{ color: "var(--color-primary)" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(student.id, displayName)}
                          disabled={isPending}
                          className="text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                          style={{ color: "var(--color-destructive)" }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {modalMode && (
        <StudentModal
          mode={modalMode}
          student={editingStudent}
          classLabels={classLabels}
          isPending={isPending}
          error={error}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ── Student Modal ─────────────────────────────────────────────

function StudentModal({
  mode,
  student,
  classLabels,
  isPending,
  error,
  onSave,
  onClose,
}: {
  mode: ModalMode;
  student: ReportBuilderStudent | null;
  classLabels: string[];
  isPending: boolean;
  error: string | null;
  onSave: (data: {
    firstName: string;
    lastName: string;
    preferredName: string;
    classLabel: string;
  }) => void;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState(student?.first_name ?? "");
  const [lastName, setLastName] = useState(student?.last_name ?? "");
  const [preferredName, setPreferredName] = useState(
    student?.preferred_name ?? "",
  );
  const [classLabel, setClassLabel] = useState(student?.class_label ?? "");
  const [newClass, setNewClass] = useState("");

  const effectiveClass = classLabel === "__new__" ? newClass : classLabel;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ firstName, lastName, preferredName, classLabel: effectiveClass });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-xl"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h2 className="text-lg font-bold text-foreground mb-4">
          {mode === "add" ? "Add student" : "Edit student"}
        </h2>

        {error && (
          <div
            className="mb-4 rounded-lg p-3 text-sm"
            style={{
              background:
                "color-mix(in srgb, var(--color-destructive) 10%, transparent)",
              color: "var(--color-destructive)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                First name *
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Last name *
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Preferred name (optional)
            </label>
            <input
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Leave blank to use first name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Class *
            </label>
            <select
              value={classLabel}
              onChange={(e) => setClassLabel(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select or create a class…</option>
              {classLabels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              <option value="__new__">+ New class…</option>
            </select>
          </div>

          {classLabel === "__new__" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Class name *
              </label>
              <input
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                required
                placeholder="e.g. Wattle Room 3–6"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground, #fff)",
              }}
            >
              {isPending
                ? "Saving…"
                : mode === "add"
                  ? "Add student"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
