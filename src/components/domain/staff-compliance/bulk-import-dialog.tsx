"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  importCertificatesBulk,
  type BulkImportResult,
} from "@/lib/actions/staff-compliance";
import type { BulkCertificateRow } from "@/lib/validations/staff-compliance";
import { useHaptics } from "@/lib/hooks/use-haptics";

const CERT_TYPE_OPTIONS = [
  "first_aid",
  "cpr",
  "anaphylaxis",
  "asthma",
  "child_safety",
  "mandatory_reporting",
  "other",
] as const;

const CSV_TEMPLATE =
  "user_email,cert_type,cert_name,issue_date,expiry_date,cert_number,provider\n" +
  "jane@example.com,first_aid,HLTAID012 First Aid,2024-06-15,2027-06-15,FA-12345,St John Ambulance\n" +
  "jane@example.com,cpr,CPR Component,2025-06-15,2026-06-15,CPR-67890,St John Ambulance\n";

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkCertificateRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const router = useRouter();
  const haptics = useHaptics();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setParseErrors([]);
    setRows([]);
    setResult(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  }

  function parseCsv(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setError("CSV must have a header row and at least one data row.");
      return;
    }

    // Skip header
    const dataLines = lines.slice(1);
    const parsed: BulkCertificateRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

      if (cols.length < 4) {
        errors.push(`Row ${i + 1}: Not enough columns (need at least 4)`);
        continue;
      }

      const [email, certType, certName, issueDate, expiryDate, certNumber, provider] = cols;

      if (!email || !email.includes("@")) {
        errors.push(`Row ${i + 1}: Invalid email "${email}"`);
        continue;
      }

      if (!CERT_TYPE_OPTIONS.includes(certType as typeof CERT_TYPE_OPTIONS[number])) {
        errors.push(
          `Row ${i + 1}: Invalid cert_type "${certType}". Must be: ${CERT_TYPE_OPTIONS.join(", ")}`,
        );
        continue;
      }

      if (!certName) {
        errors.push(`Row ${i + 1}: Missing cert_name`);
        continue;
      }

      if (!issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
        errors.push(`Row ${i + 1}: Invalid issue_date "${issueDate}" (use YYYY-MM-DD)`);
        continue;
      }

      parsed.push({
        user_email: email,
        cert_type: certType as typeof CERT_TYPE_OPTIONS[number],
        cert_name: certName,
        issue_date: issueDate,
        expiry_date: expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ? expiryDate : null,
        cert_number: certNumber || null,
        provider: provider || null,
      });
    }

    setRows(parsed);
    setParseErrors(errors);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);
    haptics.impact("medium");

    const res = await importCertificatesBulk({ rows });

    if (res.error) {
      setError(res.error.message);
      haptics.error();
    } else if (res.data) {
      setResult(res.data);
      haptics.success();
      router.refresh();
    }

    setLoading(false);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setRows([]);
          setParseErrors([]);
          setResult(null);
          setError(null);
        }}
        className="active-push touch-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: "var(--card)",
          color: "var(--foreground)",
        }}
      >
        <span aria-hidden>&#128228;</span>
        Bulk Import
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border p-6 shadow-xl"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Bulk Certificate Import
        </h3>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Upload a CSV file with staff certificates. Columns: user_email,
          cert_type, cert_name, issue_date, expiry_date, cert_number, provider.
        </p>

        {/* Template download */}
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 text-xs font-medium hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Download CSV Template
        </button>

        {/* File input */}
        <div className="mt-3">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full text-sm"
            style={{ color: "var(--foreground)" }}
          />
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div
            className="mt-3 max-h-32 overflow-y-auto scroll-native rounded-lg border border-border p-3"
            style={{
              backgroundColor: "var(--attendance-late-bg, #fef9c3)",
            }}
          >
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--attendance-late-fg, #854d0e)" }}
            >
              {parseErrors.length} parse warning{parseErrors.length !== 1 ? "s" : ""}
            </p>
            {parseErrors.map((err, i) => (
              <p
                key={i}
                className="text-xs"
                style={{ color: "var(--attendance-late-fg, #854d0e)" }}
              >
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div className="mt-3">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {rows.length} row{rows.length !== 1 ? "s" : ""} ready to import
            </p>
            <div className="mt-2 max-h-40 overflow-y-auto scroll-native rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
                    <th className="px-2 py-1 text-left">Email</th>
                    <th className="px-2 py-1 text-left">Type</th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1">{r.user_email}</td>
                      <td className="px-2 py-1">{r.cert_type}</td>
                      <td className="px-2 py-1">{r.cert_name}</td>
                      <td className="px-2 py-1">{r.expiry_date ?? "N/A"}</td>
                    </tr>
                  ))}
                  {rows.length > 20 && (
                    <tr className="border-t border-border">
                      <td
                        colSpan={4}
                        className="px-2 py-1"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        … and {rows.length - 20} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-3 space-y-2">
            <div
              className="rounded-lg border border-border p-3"
              style={{
                backgroundColor: "var(--attendance-present-bg, #dcfce7)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--attendance-present-fg, #166534)" }}
              >
                {result.imported} certificate{result.imported !== 1 ? "s" : ""}{" "}
                imported successfully
              </p>
            </div>
            {result.errors.length > 0 && (
              <div
                className="max-h-32 overflow-y-auto scroll-native rounded-lg border border-border p-3"
                style={{
                  backgroundColor: "var(--attendance-absent-bg, #fee2e2)",
                }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--attendance-absent-fg, #991b1b)" }}
                >
                  {result.errors.length} row{result.errors.length !== 1 ? "s" : ""}{" "}
                  failed
                </p>
                {result.errors.map((err, i) => (
                  <p
                    key={i}
                    className="text-xs"
                    style={{ color: "var(--attendance-absent-fg, #991b1b)" }}
                  >
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p
            className="mt-3 text-xs"
            style={{ color: "var(--destructive)" }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            {result ? "Done" : "Cancel"}
          </button>
          {!result && rows.length > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {loading ? "Importing…" : `Import ${rows.length} Row${rows.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
