"use client";

// src/components/domain/reports/SettingsClient.tsx
//
// ============================================================
// WattleOS Report Builder - Settings Client
// ============================================================
// School name override, accent colour picker, paper size,
// font choice. All feed into PDF rendering.
// ============================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateReportSettings } from "@/lib/actions/reports/report-settings";
import type { ReportSettings } from "@/lib/actions/reports/report-settings";

interface Props {
  initialSettings: ReportSettings | null;
  tenantName: string;
}

const PAPER_SIZES = ["A4", "Letter"] as const;
const FONT_CHOICES = [
  { value: "sans", label: "Sans-serif", description: "Clean and modern" },
  { value: "serif", label: "Serif", description: "Traditional and formal" },
  {
    value: "rounded",
    label: "Rounded",
    description: "Friendly and approachable",
  },
] as const;

const ACCENT_PRESETS = [
  "#22c55e", // green (default)
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#0ea5e9", // sky
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function SettingsClient({ initialSettings, tenantName }: Props) {
  const defaults = {
    school_name: initialSettings?.school_name ?? "",
    accent_colour: initialSettings?.accent_colour ?? "#22c55e",
    paper_size: initialSettings?.paper_size ?? "A4",
    font_choice: initialSettings?.font_choice ?? "sans",
  };

  const [schoolName, setSchoolName] = useState(defaults.school_name);
  const [accentColour, setAccentColour] = useState(defaults.accent_colour);
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">(
    defaults.paper_size,
  );
  const [fontChoice, setFontChoice] = useState<"serif" | "sans" | "rounded">(
    defaults.font_choice,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateReportSettings({
        school_name: schoolName.trim() || null,
        accent_colour: accentColour,
        paper_size: paperSize,
        font_choice: fontChoice,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    });
  }

  const displayName = schoolName.trim() || tenantName;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground">
            Reports
          </Link>
          <span>/</span>
          <span className="text-foreground">Settings</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Branding and formatting for your PDF reports.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* School name */}
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">
            School name
          </h2>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              School name on reports
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder={tenantName}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Appears in the PDF header. Leave blank to use &ldquo;{tenantName}
              &rdquo;.
            </p>
          </div>
        </div>

        {/* Accent colour */}
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Accent colour
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {ACCENT_PRESETS.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => setAccentColour(colour)}
                className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                style={{
                  background: colour,
                  outline:
                    accentColour === colour ? `3px solid ${colour}` : "none",
                  outlineOffset: "2px",
                }}
                title={colour}
              />
            ))}
            {/* Custom hex input */}
            <div className="flex items-center gap-2 ml-2">
              <div
                className="h-8 w-8 rounded-full border border-border"
                style={{ background: accentColour }}
              />
              <input
                type="text"
                value={accentColour}
                onChange={(e) => setAccentColour(e.target.value)}
                placeholder="#22c55e"
                className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Used for PDF report headers and section headings.
          </p>
        </div>

        {/* PDF format */}
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">
            PDF format
          </h2>

          <div className="space-y-5">
            {/* Paper size */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Paper size
              </p>
              <div className="flex items-center gap-3">
                {PAPER_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      borderColor:
                        paperSize === size
                          ? "var(--color-primary)"
                          : "var(--color-border)",
                      background:
                        paperSize === size
                          ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                          : "transparent",
                      color:
                        paperSize === size
                          ? "var(--color-primary)"
                          : "var(--color-foreground)",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Font
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {FONT_CHOICES.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => setFontChoice(font.value)}
                    className="rounded-lg border px-4 py-2 text-left transition-colors"
                    style={{
                      borderColor:
                        fontChoice === font.value
                          ? "var(--color-primary)"
                          : "var(--color-border)",
                      background:
                        fontChoice === font.value
                          ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                          : "transparent",
                    }}
                  >
                    <p
                      className="text-sm font-medium"
                      style={{
                        color:
                          fontChoice === font.value
                            ? "var(--color-primary)"
                            : "var(--color-foreground)",
                      }}
                    >
                      {font.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {font.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview strip */}
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Preview
          </h2>
          <div
            className="rounded-lg p-4"
            style={{
              background: accentColour,
              fontFamily:
                fontChoice === "serif"
                  ? "Georgia, serif"
                  : fontChoice === "rounded"
                    ? "'Nunito', sans-serif"
                    : "system-ui, sans-serif",
            }}
          >
            <p className="text-white font-bold text-sm">{displayName}</p>
            <p className="text-white text-xs mt-0.5 opacity-80">
              Term Report - {paperSize}
            </p>
          </div>
        </div>

        {/* Error / success */}
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

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            {isPending ? "Saving…" : "Save settings"}
          </button>
          {saved && (
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-success-fg, #15803d)" }}
            >
              ✓ Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
