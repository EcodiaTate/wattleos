"use client";

// src/components/domain/daily-care-log/field-config-builder.tsx
//
// Reusable form for per-room daily care field configuration.
// Renders a sortable list of care entry type rows, each with:
//   • Enabled toggle
//   • Required checkbox
//   • Custom label input
//   • Up/down reorder buttons
// Calls updateDailyCareLogConfig on save.

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { updateDailyCareLogConfig } from "@/lib/actions/daily-care-config";
import { CARE_ENTRY_TYPE_CONFIG } from "@/lib/constants/daily-care";
import type { DailyCareLogFieldConfig, CareEntryType } from "@/types/domain";

// ── Types ────────────────────────────────────────────────────

interface FieldRow {
  field_type: CareEntryType;
  is_enabled: boolean;
  is_required: boolean;
  display_order: number;
  field_label: string;
  field_description: string;
  color_tag: DailyCareLogFieldConfig["color_tag"];
}

interface FieldConfigBuilderProps {
  classId: string;
  className: string;
  initialConfigs: DailyCareLogFieldConfig[];
  onSaved?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function configsToRows(configs: DailyCareLogFieldConfig[]): FieldRow[] {
  return [...configs]
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => ({
      field_type: c.field_type,
      is_enabled: c.is_enabled,
      is_required: c.is_required,
      display_order: c.display_order,
      field_label: c.field_label ?? "",
      field_description: c.field_description ?? "",
      color_tag: c.color_tag,
    }));
}

function reassignOrder(rows: FieldRow[]): FieldRow[] {
  return rows.map((r, i) => ({ ...r, display_order: i + 1 }));
}

// ── Component ────────────────────────────────────────────────

export function FieldConfigBuilder({
  classId,
  className,
  initialConfigs,
  onSaved,
}: FieldConfigBuilderProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<FieldRow[]>(() =>
    configsToRows(initialConfigs),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // ── Row updates ────────────────────────────────────────────

  function toggleEnabled(fieldType: CareEntryType) {
    haptics.impact("light");
    setRows((prev) =>
      prev.map((r) =>
        r.field_type === fieldType
          ? {
              ...r,
              is_enabled: !r.is_enabled,
              // Disabling clears required
              is_required: r.is_enabled ? false : r.is_required,
            }
          : r,
      ),
    );
  }

  function toggleRequired(fieldType: CareEntryType) {
    haptics.impact("light");
    setRows((prev) =>
      prev.map((r) =>
        r.field_type === fieldType
          ? { ...r, is_required: !r.is_required }
          : r,
      ),
    );
  }

  function setLabel(fieldType: CareEntryType, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.field_type === fieldType ? { ...r, field_label: value } : r,
      ),
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    haptics.impact("light");
    setRows((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return reassignOrder(next);
    });
  }

  function moveDown(index: number) {
    setRows((prev) => {
      if (index === prev.length - 1) return prev;
      haptics.impact("light");
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return reassignOrder(next);
    });
  }

  // ── Save ───────────────────────────────────────────────────

  function handleSave() {
    setSaveError(null);
    setSavedOk(false);
    startTransition(async () => {
      const result = await updateDailyCareLogConfig({
        class_id: classId,
        configs: rows.map((r) => ({
          field_type: r.field_type,
          is_enabled: r.is_enabled,
          is_required: r.is_required,
          display_order: r.display_order,
          field_label: r.field_label || null,
          field_description: r.field_description || null,
          color_tag: r.color_tag ?? null,
        })),
      });

      if (result.error) {
        haptics.error();
        setSaveError(result.error.message);
        return;
      }

      haptics.success();
      setSavedOk(true);
      onSaved?.();

      // Reset saved indicator after 2s
      setTimeout(() => setSavedOk(false), 2000);
    });
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {className}
          </h2>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Configure which care entry types are visible for this room
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Saving…" : savedOk ? "Saved" : "Save Changes"}
        </button>
      </div>

      {/* Error */}
      {saveError && (
        <p
          className="rounded-lg border p-3 text-sm"
          style={{
            color: "var(--destructive)",
            borderColor: "var(--destructive)",
            background: "var(--destructive-foreground)",
          }}
        >
          {saveError}
        </p>
      )}

      {/* Column headings */}
      <div
        className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 text-xs font-medium sm:grid"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>Field</span>
        <span className="w-20 text-center">Enabled</span>
        <span className="w-20 text-center">Required</span>
        <span className="w-40">Custom Label</span>
        <span className="w-16 text-center">Order</span>
      </div>

      {/* Field rows */}
      <div
        className="divide-y rounded-xl border"
        style={{
          borderColor: "var(--border)",
        }}
      >
        {rows.map((row, index) => {
          const config = CARE_ENTRY_TYPE_CONFIG[row.field_type];
          const isFirst = index === 0;
          const isLast = index === rows.length - 1;

          return (
            <div
              key={row.field_type}
              className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center"
              style={{
                opacity: row.is_enabled ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}
            >
              {/* Field label + emoji */}
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                  style={{ background: config.cssVarBg }}
                >
                  {config.emoji}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {config.label}
                </span>
              </div>

              {/* Enabled toggle */}
              <div className="flex w-20 items-center justify-between gap-2 sm:justify-center">
                <span
                  className="text-xs sm:hidden"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Enabled
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.is_enabled}
                  onClick={() => toggleEnabled(row.field_type)}
                  className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                  style={{
                    background: row.is_enabled
                      ? "var(--primary)"
                      : "var(--muted)",
                  }}
                >
                  <span
                    className="pointer-events-none inline-block h-4 w-4 rounded-full transition-transform"
                    style={{
                      background: "var(--background)",
                      transform: row.is_enabled
                        ? "translateX(18px)"
                        : "translateX(2px)",
                    }}
                  />
                </button>
              </div>

              {/* Required checkbox */}
              <div className="flex w-20 items-center justify-between gap-2 sm:justify-center">
                <span
                  className="text-xs sm:hidden"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Required
                </span>
                <input
                  type="checkbox"
                  checked={row.is_required}
                  disabled={!row.is_enabled}
                  onChange={() => toggleRequired(row.field_type)}
                  className="h-4 w-4 cursor-pointer rounded"
                  style={{ accentColor: "var(--primary)" }}
                />
              </div>

              {/* Custom label */}
              <div className="flex w-40 flex-col gap-1">
                <span
                  className="text-xs sm:hidden"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Custom Label
                </span>
                <input
                  type="text"
                  placeholder={config.label}
                  value={row.field_label}
                  maxLength={100}
                  onChange={(e) => setLabel(row.field_type, e.target.value)}
                  className="w-full rounded-md border bg-transparent px-2 py-1 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outlineColor = "var(--primary)";
                  }}
                />
              </div>

              {/* Order arrows */}
              <div className="flex w-16 items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={isFirst}
                  aria-label="Move up"
                  className="rounded p-1 transition-colors hover:bg-[var(--muted)] disabled:opacity-30"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={isLast}
                  aria-label="Move down"
                  className="rounded p-1 transition-colors hover:bg-[var(--muted)] disabled:opacity-30"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Disabled fields are hidden from educators recording care entries.
        Required fields must be filled before saving an entry.
      </p>
    </div>
  );
}
