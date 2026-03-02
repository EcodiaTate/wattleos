"use client";

import { useState, useMemo, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCareEntry } from "@/lib/actions/daily-care";
import { SUNSCREEN_REAPPLY_MINUTES } from "@/lib/constants/daily-care";

interface SunscreenEntryFormProps {
  studentId: string;
  logDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const QUICK_SPF = [30, 50] as const;

export function SunscreenEntryForm({
  studentId,
  logDate,
  onSuccess,
  onCancel,
}: SunscreenEntryFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [spf, setSpf] = useState<number | null>(50);
  const [customSpf, setCustomSpf] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [notes, setNotes] = useState("");

  // Calculate reapply reminder time
  const reapplyTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + SUNSCREEN_REAPPLY_MINUTES);
    return now.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  function selectQuickSpf(value: number) {
    haptics.impact("light");
    setSpf(value);
    setIsCustom(false);
    setCustomSpf("");
  }

  function enableCustomSpf() {
    haptics.impact("light");
    setIsCustom(true);
    setSpf(null);
  }

  function handleCustomSpfChange(value: string) {
    setCustomSpf(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      setSpf(parsed);
    } else {
      setSpf(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!spf) {
      setError("Please select or enter an SPF value");
      haptics.error();
      return;
    }

    startTransition(async () => {
      haptics.impact("medium");

      const result = await addCareEntry({
        student_id: studentId,
        log_date: logDate,
        entry_type: "sunscreen",
        sunscreen_spf: spf,
        notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* SPF Selector */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          SPF
        </label>
        <div className="flex gap-2">
          {QUICK_SPF.map((value) => (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => selectQuickSpf(value)}
              className="active-push touch-target flex-1 rounded-[var(--radius-md)] border px-4 py-3 text-base font-semibold transition-colors"
              style={{
                borderColor:
                  !isCustom && spf === value
                    ? "var(--care-sunscreen)"
                    : "var(--border)",
                background:
                  !isCustom && spf === value
                    ? "var(--care-sunscreen-bg)"
                    : "var(--card)",
                color:
                  !isCustom && spf === value
                    ? "var(--care-sunscreen-fg)"
                    : "var(--foreground)",
              }}
            >
              SPF {value}
            </button>
          ))}
          <button
            type="button"
            disabled={isPending}
            onClick={enableCustomSpf}
            className="active-push touch-target rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium transition-colors"
            style={{
              borderColor: isCustom
                ? "var(--care-sunscreen)"
                : "var(--border)",
              background: isCustom
                ? "var(--care-sunscreen-bg)"
                : "var(--card)",
              color: isCustom
                ? "var(--care-sunscreen-fg)"
                : "var(--foreground)",
            }}
          >
            Other
          </button>
        </div>

        {/* Custom SPF Input */}
        {isCustom && (
          <input
            type="number"
            value={customSpf}
            onChange={(e) => handleCustomSpfChange(e.target.value)}
            disabled={isPending}
            min={1}
            max={100}
            placeholder="Enter SPF value"
            autoFocus
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        )}
      </div>

      {/* Reapply Reminder */}
      <div
        className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs"
        style={{
          borderColor: "var(--care-sunscreen)",
          background:
            "color-mix(in srgb, var(--care-sunscreen) 8%, transparent)",
          color: "var(--care-sunscreen-fg)",
        }}
      >
        <span style={{ fontSize: "1rem" }}>{"\u2600\uFE0F"}</span>
        <span>
          Reapply reminder will be set for{" "}
          <strong>{reapplyTime}</strong>
        </span>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={1}
          placeholder="Any additional notes..."
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm resize-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors"
          style={{ background: "var(--card)", color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !spf}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Recording..." : "Record"}
        </button>
      </div>
    </form>
  );
}
