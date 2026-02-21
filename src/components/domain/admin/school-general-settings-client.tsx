// src/components/domain/admin/school-general-settings-client.tsx
//
// ============================================================
// WattleOS V2 - School General Settings (Client Component)
// ============================================================
// Editable form for core tenant fields: name, logo, timezone,
// country, currency. Logo supports drag-and-drop or click-to-
// upload with live preview.
//
// WHY separate client component: The general settings form
// needs interactivity (file upload, form state, optimistic
// preview). The server page fetches initial data and passes
// it as props — fast, no loading state.
//
// WHY router.refresh() on save: Same pattern as appearance
// settings. Re-runs server components so the sidebar picks up
// the new tenant name / logo without destroying client state.
// ============================================================

"use client";

import {
  deleteTenantLogo,
  updateTenantGeneralSettings,
  uploadTenantLogo,
} from "@/lib/actions/tenant-settings";
import type { TenantGeneralSettings } from "@/lib/constants/tenant-settings";
import {
  AUSTRALIAN_TIMEZONES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
} from "@/lib/constants/tenant-settings";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ChangeEvent,
} from "react";

// ============================================================
// Props
// ============================================================

interface SchoolGeneralSettingsClientProps {
  initialSettings: TenantGeneralSettings;
  tenantSlug: string;
}

// ============================================================
// Component
// ============================================================

export function SchoolGeneralSettingsClient({
  initialSettings,
  tenantSlug,
}: SchoolGeneralSettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] =
    useState<TenantGeneralSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Logo upload state ─────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived: has changes? ─────────────────────────────────
  const hasChanges =
    settings.name !== initialSettings.name ||
    settings.timezone !== initialSettings.timezone ||
    settings.country !== initialSettings.country ||
    settings.currency !== initialSettings.currency;

  // ── Field updater ─────────────────────────────────────────
  const updateField = <K extends keyof TenantGeneralSettings>(
    key: K,
    value: TenantGeneralSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
    setErrorMessage(null);
  };

  // ── Save general settings ─────────────────────────────────
  const handleSave = () => {
    startTransition(async () => {
      const result = await updateTenantGeneralSettings({
        name: settings.name,
        timezone: settings.timezone,
        country: settings.country,
        currency: settings.currency,
      });

      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error.message);
      } else {
        setSaveStatus("saved");
        setErrorMessage(null);
        router.refresh();
      }
    });
  };

  // ── Logo upload handler ───────────────────────────────────
  const handleLogoUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadTenantLogo(formData);

      if (result.error) {
        setErrorMessage(result.error.message);
        setIsUploading(false);
        return;
      }

      if (result.data) {
        setSettings((prev) => ({
          ...prev,
          logo_url: result.data!.logo_url,
        }));
        router.refresh();
      }

      setIsUploading(false);
    },
    [router],
  );

  // ── Logo delete handler ───────────────────────────────────
  const handleLogoDelete = useCallback(async () => {
    setIsUploading(true);
    setErrorMessage(null);

    const result = await deleteTenantLogo();

    if (result.error) {
      setErrorMessage(result.error.message);
    } else {
      setSettings((prev) => ({ ...prev, logo_url: null }));
      router.refresh();
    }

    setIsUploading(false);
  }, [router]);

  // ── File input change ─────────────────────────────────────
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Drag & drop handlers ──────────────────────────────────
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
      <h2 className="text-lg font-semibold text-foreground">
        School Profile
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your school&apos;s name, logo, and regional settings. The logo appears
        in the sidebar, reports, and public-facing pages.
      </p>

      <div className="mt-6 space-y-6">
        {/* ── Logo ── */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            School Logo
          </label>

          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted/30 overflow-hidden">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="School logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {settings.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Upload area */}
            <div className="flex-1 space-y-2">
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={onFileChange}
                  className="hidden"
                />

                {isUploading ? (
                  <span className="text-sm text-muted-foreground">
                    Uploading…
                  </span>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drop an image here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG, WebP or SVG. Max 2 MB.
                    </p>
                  </div>
                )}
              </div>

              {settings.logo_url && (
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  disabled={isUploading}
                  className="text-xs text-destructive hover:underline disabled:opacity-50"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── School Name ── */}
        <div>
          <label
            htmlFor="school-name"
            className="block text-sm font-medium text-foreground mb-1"
          >
            School Name
          </label>
          <input
            id="school-name"
            type="text"
            value={settings.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Green Valley Montessori"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Displayed in the sidebar, reports, and emails. Your URL slug
            remains <span className="font-mono text-foreground">{tenantSlug}</span>.
          </p>
        </div>

        {/* ── Timezone ── */}
        <div>
          <label
            htmlFor="school-timezone"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Timezone
          </label>
          <select
            id="school-timezone"
            value={settings.timezone}
            onChange={(e) => updateField("timezone", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {AUSTRALIAN_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Used for attendance times, report dates, and scheduled
            communications.
          </p>
        </div>

        {/* ── Country & Currency (side by side) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="school-country"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Country
            </label>
            <select
              id="school-country"
              value={settings.country}
              onChange={(e) => updateField("country", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="school-currency"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Currency
            </label>
            <select
              id="school-currency"
              value={settings.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Save button ── */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Profile"}
          </button>

          {saveStatus === "saved" && (
            <span className="text-sm text-success animate-fade-in">
              ✓ Saved successfully
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-destructive animate-fade-in">
              {errorMessage ?? "Failed to save. Please try again."}
            </span>
          )}
        </div>

        {/* ── General error display ── */}
        {errorMessage && saveStatus !== "error" && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    </section>
  );
}