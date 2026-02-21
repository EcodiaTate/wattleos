// src/app/(app)/admin/data-import/mass-invite-client.tsx
//
// ============================================================
// WattleOS V2 - Mass Invite Client Component
// ============================================================
// WHY: Streamlined CSV → invite flow for parents and staff.
// Updated to use the WattleOS V2 design system tokens for
// brand-configurable colors, density, and interactive states.
// ============================================================

"use client";

import {
  generateCSVTemplate,
  parseCSV,
  suggestColumnMapping,
} from "@/lib/data-import/csv-parser";
import {
  massInviteParents,
  massInviteStaff,
  massOnboardParents,
  type MassInviteParentRow,
  type MassInviteResult,
  type MassInviteStaffRow,
} from "@/lib/data-import/mass-invite-actions";
import type {
  ColumnMapping,
  MappingSuggestion,
  ParsedCSV,
  WattleField,
} from "@/lib/data-import/types";
import { GUARDIAN_FIELDS, STAFF_FIELDS } from "@/lib/data-import/types";
import { useCallback, useRef, useState } from "react";

// ============================================================
// Types
// ============================================================

type InviteMode = "parents" | "staff";
type InviteStep = "select" | "upload" | "preview" | "sending" | "results";

// ============================================================
// Component
// ============================================================

export function MassInviteClient() {
  const [mode, setMode] = useState<InviteMode | null>(null);
  const [step, setStep] = useState<InviteStep>("select");
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<MassInviteResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [createAccounts, setCreateAccounts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields: WattleField[] =
    mode === "parents" ? GUARDIAN_FIELDS : STAFF_FIELDS;

  // ── Reset ──────────────────────────────────────────────────

  const reset = useCallback(() => {
    setMode(null);
    setStep("select");
    setParsedCSV(null);
    setFileName(null);
    setParseError(null);
    setMapping({});
    setSuggestions([]);
    setSending(false);
    setResult(null);
    setSendError(null);
    setCreateAccounts(false);
  }, []);

  // ── File handling ──────────────────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      setParseError(null);

      if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
        setParseError("Please upload a CSV file (.csv, .tsv, or .txt)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setParseError("File is too large. Maximum 10 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { data, error } = parseCSV(text);

        if (error) {
          setParseError(error);
          return;
        }

        if (data) {
          setParsedCSV(data);
          setFileName(file.name);

          const sug = suggestColumnMapping(data.headers, fields);
          setSuggestions(sug);

          const autoMap: ColumnMapping = {};
          for (const s of sug) {
            if (s.confidence >= 0.7) {
              autoMap[s.csv_header] = s.wattle_field;
            }
          }
          setMapping(autoMap);
          setStep("preview");
        }
      };
      reader.readAsText(file);
    },
    [fields],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Rows Builders ──────────────────────────────────────────

  function buildParentRows(): MassInviteParentRow[] {
    if (!parsedCSV) return [];
    return parsedCSV.rows.map((row) => ({
      guardian_email: row[findCSVHeader("guardian_email")] ?? "",
      guardian_first_name: row[findCSVHeader("guardian_first_name")] ?? "",
      guardian_last_name: row[findCSVHeader("guardian_last_name")] ?? "",
      student_first_name: row[findCSVHeader("student_first_name")] ?? "",
      student_last_name: row[findCSVHeader("student_last_name")] ?? "",
      relationship: row[findCSVHeader("relationship")] ?? "other",
      phone: row[findCSVHeader("phone")] ?? undefined,
      is_primary:
        (row[findCSVHeader("is_primary")] ?? "").toLowerCase() === "yes" ||
        (row[findCSVHeader("is_primary")] ?? "").toLowerCase() === "true",
    }));
  }

  function buildStaffRows(): MassInviteStaffRow[] {
    if (!parsedCSV) return [];
    return parsedCSV.rows.map((row) => ({
      email: row[findCSVHeader("email")] ?? "",
      first_name: row[findCSVHeader("first_name")] ?? "",
      last_name: row[findCSVHeader("last_name")] ?? "",
      role: row[findCSVHeader("role")] ?? "",
    }));
  }

  function findCSVHeader(wattleKey: string): string {
    for (const [csvH, wK] of Object.entries(mapping)) {
      if (wK === wattleKey) return csvH;
    }
    return "";
  }

  async function handleSend() {
    setSending(true);
    setSendError(null);

    try {
      let response: Awaited<ReturnType<typeof massInviteParents>>;

      if (mode === "parents") {
        const rows = buildParentRows();
        response = createAccounts
          ? await massOnboardParents(rows)
          : await massInviteParents(rows);
      } else {
        const rows = buildStaffRows();
        response = await massInviteStaff(rows);
      }

      if (response.error) {
        setSendError(response.error.message);
      } else if (response.data) {
        setResult(response.data);
        setStep("results");
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  function downloadTemplate() {
    const csv = generateCSVTemplate(fields);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wattleos-${mode}-invite-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const requiredFields = fields.filter((f) => f.required);
  const mappedWattleKeys = new Set(Object.values(mapping));
  const missingRequired = requiredFields.filter(
    (f) => !mappedWattleKeys.has(f.key),
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Step: Select Mode ─────────────────────────────── */}
      {step === "select" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-fade-in-up">
          <button
            onClick={() => {
              setMode("parents");
              setStep("upload");
            }}
            className="card-interactive rounded-lg border bg-card p-6 text-left"
          >
            <div className="mb-3 text-3xl">👨‍👩‍👧‍👦</div>
            <h3 className="font-bold text-foreground">Invite Parents</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Upload guardian emails linked to students. Creates invitations and
              optionally pre-provisions accounts.
            </p>
            <div className="mt-4 flex flex-wrap gap-1">
              {["Student Names", "Emails", "Relationship"].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>

          <button
            onClick={() => {
              setMode("staff");
              setStep("upload");
            }}
            className="card-interactive rounded-lg border bg-card p-6 text-left"
          >
            <div className="mb-3 text-3xl">🧑‍🏫</div>
            <h3 className="font-bold text-foreground">Invite Staff</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Onboard staff members in bulk. Creates accounts and triggers
              automated welcome emails.
            </p>
            <div className="mt-4 flex flex-wrap gap-1">
              {["Full Name", "Email", "System Role"].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        </div>
      )}

      {/* ── Step: Upload ──────────────────────────────────── */}
      {step === "upload" && mode && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {mode === "parents" ? "Parent Invitations" : "Staff Invitations"}
            </h3>
            <button
              onClick={reset}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="rounded-md border bg-card px-3 py-2 text-xs font-bold shadow-sm hover:bg-muted transition-all active:scale-95"
            >
              📥 Download Template
            </button>
          </div>

          <div className="rounded-lg bg-primary-50/30 border border-primary-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
              Required columns:
            </p>
            <p className="mt-1 text-sm font-medium text-primary-900/70">
              {requiredFields.map((f) => f.label).join(" · ")}
            </p>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-10 transition-all hover:border-primary hover:bg-primary-50/20"
          >
            <div className="mb-3 text-4xl">📄</div>
            <p className="font-bold text-foreground">
              Drop CSV here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              .csv, .tsv, or .txt - max 10 MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {parseError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive animate-slide-down">
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Preview & Map ───────────────────────────── */}
      {step === "preview" && parsedCSV && mode && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground">Mapping Columns</h3>
              <p className="text-xs text-muted-foreground">
                {parsedCSV.raw_row_count} rows found in {fileName}
              </p>
            </div>
            <button
              onClick={() => {
                setStep("upload");
                setParsedCSV(null);
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Change file
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {parsedCSV.headers.map((csvH) => {
              const suggestion = suggestions.find((s) => s.csv_header === csvH);
              return (
                <div
                  key={csvH}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-muted-foreground uppercase">
                      {csvH}
                    </p>
                  </div>
                  <div className="text-muted-foreground/30 font-light">→</div>
                  <select
                    value={mapping[csvH] ?? ""}
                    onChange={(e) => {
                      setMapping((prev) => ({
                        ...prev,
                        [csvH]: e.target.value,
                      }));
                    }}
                    className="rounded bg-muted px-2 py-1.5 text-sm font-medium outline-none focus:bg-background"
                  >
                    <option value="">Skip</option>
                    {fields.map((f) => (
                      <option
                        key={f.key}
                        value={f.key}
                        disabled={
                          mappedWattleKeys.has(f.key) && mapping[csvH] !== f.key
                        }
                      >
                        {f.label} {f.required ? "*" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {missingRequired.length > 0 && (
            <div className="rounded-lg bg-warning/10 p-3 text-sm font-medium text-warning-foreground border border-warning/20">
              Missing required fields:{" "}
              {missingRequired.map((f) => f.label).join(", ")}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-card shadow-inner">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-muted-foreground">
                    #
                  </th>
                  {parsedCSV.headers.slice(0, 4).map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsedCSV.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-muted-foreground">
                      {i + 1}
                    </td>
                    {parsedCSV!.headers.slice(0, 4).map((h) => (
                      <td
                        key={h}
                        className="px-4 py-2 text-foreground/80 italic"
                      >
                        {row[h] || " - "}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mode === "parents" && (
            <div className="rounded-xl border bg-primary-50/10 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccounts}
                  onChange={(e) => setCreateAccounts(e.target.checked)}
                  className="mt-1 rounded border-border accent-primary"
                />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Provision accounts immediately
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If enabled, WattleOS will create the guardian profiles and
                    link them to students now. Parents will receive a password
                    setup email instead of a generic invitation.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSend}
              disabled={sending || missingRequired.length > 0}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-primary transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {sending
                ? "Sending..."
                : `Send ${parsedCSV.raw_row_count} Invites`}
            </button>
            <button
              onClick={reset}
              className="rounded-lg border bg-card px-6 py-2.5 text-sm font-bold hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>

          {sendError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {sendError}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Results ─────────────────────────────────── */}
      {step === "results" && result && (
        <div className="space-y-6 animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="text-4xl">
              {result.errors.length === 0 ? "✅" : "⚠️"}
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {result.errors.length === 0
                  ? "Blast Complete!"
                  : "Sent with issues"}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                Processed{" "}
                {result.invited + result.skipped + result.errors.length} rows
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Invited"
              value={result.invited}
              color="success"
            />
            <ResultCard
              label="Skipped"
              value={result.skipped}
              color="warning"
            />
            <ResultCard
              label="Errors"
              value={result.errors.length}
              color="destructive"
            />
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Issue Log
              </p>
              <div className="max-h-48 overflow-y-auto rounded-xl border bg-card shadow-inner divide-y">
                {result.errors.slice(0, 50).map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 text-[11px]"
                  >
                    <span className="font-bold text-muted-foreground tabular-nums">
                      Row {err.row}
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[120px]">
                      {err.email}
                    </span>
                    <span className="text-destructive font-medium ml-auto">
                      {err.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground shadow-primary transition-all hover:scale-[1.02] active:scale-95"
          >
            Finished
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Internal UI Helpers
// ============================================================

function ResultCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "success" | "warning" | "destructive";
}) {
  const colorMap = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-tighter opacity-80">
        {label}
      </p>
    </div>
  );
}
