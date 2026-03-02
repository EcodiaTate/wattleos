"use client";

import { useState } from "react";
import type {
  CcsSessionReportWithStudent,
  CcsAbsenceTypeCode,
} from "@/types/domain";
import { updateSessionReport } from "@/lib/actions/ccs";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ReportEditFormProps {
  reportId: string;
  report: CcsSessionReportWithStudent;
  absenceCodes: CcsAbsenceTypeCode[];
  onClose: () => void;
}

export function ReportEditForm({
  reportId,
  report,
  absenceCodes,
  onClose,
}: ReportEditFormProps) {
  const haptics = useHaptics();
  const [absenceCode, setAbsenceCode] = useState(
    report.absence_type_code ?? "",
  );
  const [gapFee, setGapFee] = useState((report.gap_fee_cents / 100).toFixed(2));
  const [discount, setDiscount] = useState(
    (report.prescribed_discount_cents / 100).toFixed(2),
  );
  const [thirdParty, setThirdParty] = useState(
    (report.third_party_payment_cents / 100).toFixed(2),
  );
  const [notes, setNotes] = useState(report.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    haptics.impact("medium");
    setSaving(true);
    setError(null);

    const result = await updateSessionReport(reportId, {
      absence_type_code: absenceCode || null,
      gap_fee_cents: Math.round(parseFloat(gapFee || "0") * 100),
      prescribed_discount_cents: Math.round(parseFloat(discount || "0") * 100),
      third_party_payment_cents: Math.round(
        parseFloat(thirdParty || "0") * 100,
      ),
      notes: notes || null,
    });

    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      haptics.success();
      onClose();
    }

    setSaving(false);
  }

  return (
    <div
      className="rounded-lg border border-border p-4 space-y-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        Edit Report - {report.student.first_name} {report.student.last_name},{" "}
        {report.session_date}
      </h3>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {report.absence_flag && (
          <label className="space-y-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Absence Code
            </span>
            <select
              value={absenceCode}
              onChange={(e) => {
                setAbsenceCode(e.target.value);
                haptics.impact("light");
              }}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            >
              <option value="">Select code...</option>
              {absenceCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.label}
                  {c.annual_cap_applies ? " (capped)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Gap Fee ($)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={gapFee}
            onChange={(e) => setGapFee(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
        </label>

        <label className="space-y-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Prescribed Discount ($)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
        </label>

        <label className="space-y-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Third Party Payment ($)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={thirdParty}
            onChange={(e) => setThirdParty(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Notes
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
          onClick={() => {
            haptics.impact("light");
            onClose();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
