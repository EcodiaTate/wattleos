"use client";

import { useState, useTransition, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  IdCardTemplate,
  IdCardTemplateConfig,
  IdCardPersonData,
} from "@/types/domain";
import type { SaveIdCardTemplateInput } from "@/lib/validations/school-photos";
import { IdCardPreview } from "./id-card-preview";

// ============================================================
// ID Card Template Form (Module R)
// ============================================================
// Two-column layout: form on left, live preview on right.
// Allows configuring all aspects of an ID card template with
// real-time visual feedback. Delegates save to parent callback.
// ============================================================

const DEFAULT_CONFIG: IdCardTemplateConfig = {
  show_logo: true,
  show_class: true,
  show_year: true,
  show_qr_code: false,
  show_barcode: true,
  card_orientation: "portrait",
  primary_color: "#1e40af",
  secondary_color: "#3b82f6",
  font_size_name: 14,
  font_size_class: 11,
};

interface IdCardTemplateFormProps {
  template?: IdCardTemplate;
  onSave: (input: SaveIdCardTemplateInput) => Promise<void>;
  samplePerson: IdCardPersonData;
  schoolName: string;
  schoolLogoUrl: string | null;
}

export function IdCardTemplateForm({
  template,
  onSave,
  samplePerson,
  schoolName,
  schoolLogoUrl,
}: IdCardTemplateFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(template?.name ?? "");
  const [personType, setPersonType] = useState<"student" | "staff">(
    template?.person_type ?? "student",
  );
  const [config, setConfig] = useState<IdCardTemplateConfig>(
    template?.template_config ?? DEFAULT_CONFIG,
  );
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false);

  const currentYear = new Date().getFullYear().toString();

  const updateConfig = useCallback(
    <K extends keyof IdCardTemplateConfig>(
      key: K,
      value: IdCardTemplateConfig[K],
    ) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  function handleSave(setAsDefault: boolean) {
    setError(null);

    if (!name.trim()) {
      setError("Template name is required.");
      haptics.error();
      return;
    }

    const input: SaveIdCardTemplateInput = {
      id: template?.id ?? null,
      name: name.trim(),
      person_type: personType,
      template_config: config,
      is_default: setAsDefault || isDefault,
    };

    startTransition(async () => {
      try {
        await onSave(input);
        haptics.impact("medium");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save template";
        setError(message);
        haptics.error();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Form column */}
      <div className="flex-1 space-y-5">
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

        {/* Template Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="template-name"
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Template Name
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Student ID Card 2026"
            maxLength={200}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Person Type */}
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Card Type
          </label>
          <div className="flex gap-2">
            {(["student", "staff"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPersonType(type);
                  haptics.impact("light");
                }}
                className="active-push touch-target flex-1 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium capitalize transition-all"
                style={{
                  borderColor:
                    personType === type
                      ? "var(--primary)"
                      : "var(--border)",
                  background:
                    personType === type
                      ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                      : "var(--background)",
                  color:
                    personType === type
                      ? "var(--primary)"
                      : "var(--foreground)",
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Card Orientation Toggle */}
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Orientation
          </label>
          <div className="flex gap-2">
            {(["portrait", "landscape"] as const).map((orientation) => (
              <button
                key={orientation}
                type="button"
                onClick={() => {
                  updateConfig("card_orientation", orientation);
                  haptics.impact("light");
                }}
                className="active-push touch-target flex-1 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium capitalize transition-all"
                style={{
                  borderColor:
                    config.card_orientation === orientation
                      ? "var(--primary)"
                      : "var(--border)",
                  background:
                    config.card_orientation === orientation
                      ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                      : "var(--background)",
                  color:
                    config.card_orientation === orientation
                      ? "var(--primary)"
                      : "var(--foreground)",
                }}
              >
                {orientation}
              </button>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="primary-color"
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={config.primary_color}
                onChange={(e) => updateConfig("primary_color", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-[var(--radius-md)] border border-border"
                style={{ padding: 2 }}
              />
              <input
                type="text"
                value={config.primary_color}
                onChange={(e) => updateConfig("primary_color", e.target.value)}
                className="flex-1 rounded-[var(--radius-md)] border border-border px-2 py-1 text-xs font-mono"
                style={{
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="secondary-color"
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="secondary-color"
                type="color"
                value={config.secondary_color}
                onChange={(e) =>
                  updateConfig("secondary_color", e.target.value)
                }
                className="h-10 w-10 cursor-pointer rounded-[var(--radius-md)] border border-border"
                style={{ padding: 2 }}
              />
              <input
                type="text"
                value={config.secondary_color}
                onChange={(e) =>
                  updateConfig("secondary_color", e.target.value)
                }
                className="flex-1 rounded-[var(--radius-md)] border border-border px-2 py-1 text-xs font-mono"
                style={{
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Card Elements
          </p>

          {([
            { key: "show_logo", label: "Show School Logo" },
            { key: "show_class", label: "Show Class / Position" },
            { key: "show_year", label: "Show Year" },
            { key: "show_qr_code", label: "Show QR Code" },
            { key: "show_barcode", label: "Show Barcode" },
          ] as const).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2.5"
              style={{ background: "var(--background)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {label}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config[key]}
                onClick={() => {
                  updateConfig(key, !config[key]);
                  haptics.impact("light");
                }}
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{
                  background: config[key]
                    ? "var(--primary)"
                    : "var(--muted)",
                }}
              >
                <span
                  className="absolute top-0.5 block h-5 w-5 rounded-full shadow transition-transform"
                  style={{
                    background: "white",
                    transform: config[key]
                      ? "translateX(22px)"
                      : "translateX(2px)",
                  }}
                />
              </button>
            </label>
          ))}
        </div>

        {/* Font Size Sliders */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="font-size-name"
              className="flex items-center justify-between text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              <span>Name Font Size</span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--muted-foreground)" }}
              >
                {config.font_size_name}px
              </span>
            </label>
            <input
              id="font-size-name"
              type="range"
              min={8}
              max={32}
              step={1}
              value={config.font_size_name}
              onChange={(e) =>
                updateConfig("font_size_name", Number(e.target.value))
              }
              className="w-full"
              style={{ accentColor: "var(--primary)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="font-size-class"
              className="flex items-center justify-between text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              <span>Class Font Size</span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--muted-foreground)" }}
              >
                {config.font_size_class}px
              </span>
            </label>
            <input
              id="font-size-class"
              type="range"
              min={6}
              max={24}
              step={1}
              value={config.font_size_class}
              onChange={(e) =>
                updateConfig("font_size_class", Number(e.target.value))
              }
              className="w-full"
              style={{ accentColor: "var(--primary)" }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isPending}
            className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving..." : "Save Template"}
          </button>
          {!template?.is_default && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isPending}
              className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              {isPending ? "Saving..." : "Set as Default"}
            </button>
          )}
        </div>
      </div>

      {/* Preview column */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p
          className="mb-3 text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Live Preview
        </p>
        <div
          className="flex items-center justify-center rounded-[var(--radius-lg)] border border-border p-6"
          style={{ background: "var(--muted)" }}
        >
          <IdCardPreview
            config={config}
            person={samplePerson}
            schoolName={schoolName}
            schoolLogoUrl={schoolLogoUrl}
            year={currentYear}
          />
        </div>
        <p
          className="mt-2 text-center text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          85.6mm x 54mm (standard ID card)
        </p>
      </div>
    </div>
  );
}
