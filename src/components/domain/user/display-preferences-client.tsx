// src/components/domain/user/display-preferences-client.tsx
//
// ============================================================
// WattleOS V2 — User Display Preferences Form
// ============================================================
// Allows any authenticated user to override theme, density,
// and font scale for their personal experience.
//
// WHY separate from admin appearance:
//   Admin sets school-wide defaults. User overrides are personal.
//   A user picking "compact + dark" doesn't affect other staff.
//
// LIVE PREVIEW: Changes apply to DOM immediately. On save,
// the server action persists to DB and refreshes the cookie.
// ============================================================

"use client";

import { updateUserDisplayPreferences } from "@/lib/actions/display-settings";
import {
  type DensityMode,
  type ThemeMode,
  type UserDisplayPreferences,
  DENSITY_OPTIONS,
  FONT_SCALE_OPTIONS,
  THEME_OPTIONS,
} from "@/types/display";
import { useCallback, useState, useTransition } from "react";

interface DisplayPreferencesClientProps {
  initialPreferences: UserDisplayPreferences;
  tenantDefaultDensity: DensityMode;
  tenantDefaultTheme: ThemeMode;
}

export function DisplayPreferencesClient({
  initialPreferences,
  tenantDefaultDensity,
  tenantDefaultTheme,
}: DisplayPreferencesClientProps) {
  const [prefs, setPrefs] =
    useState<UserDisplayPreferences>(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  // ---- Live preview ----

  const applyPreview = useCallback(
    (updated: UserDisplayPreferences) => {
      const html = document.documentElement;

      // Theme
      const effectiveTheme = updated.theme ?? tenantDefaultTheme;
      if (effectiveTheme === "dark") {
        html.classList.add("dark");
      } else if (effectiveTheme === "light") {
        html.classList.remove("dark");
      } else {
        // system: check OS preference
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          html.classList.add("dark");
        } else {
          html.classList.remove("dark");
        }
      }

      // Density
      html.dataset.density = updated.density ?? tenantDefaultDensity;

      // Font scale
      html.dataset.fontScale = updated.fontScale ?? "base";
    },
    [tenantDefaultDensity, tenantDefaultTheme],
  );

  const updateField = <K extends keyof UserDisplayPreferences>(
    key: K,
    value: UserDisplayPreferences[K],
  ) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    applyPreview(updated);
    setSaveStatus("idle");
  };

  // ---- Save ----

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateUserDisplayPreferences(prefs);
      if (result.error) {
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        // Reload to pick up fresh cookie in root layout
        setTimeout(() => window.location.reload(), 800);
      }
    });
  };

  // Effective values (for showing "using school default" state)
  const effectiveTheme = prefs.theme ?? tenantDefaultTheme;
  const effectiveDensity = prefs.density ?? tenantDefaultDensity;

  return (
    <div className="space-y-[var(--density-section-gap)] max-w-[var(--content-narrow-width)]">
      {/* ---- Theme ---- */}
      <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-foreground">
          Theme
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Choose light, dark, or follow your device settings.
          {prefs.theme === null && (
            <span className="ml-1 text-[var(--text-xs)] italic">
              (Currently using school default: {tenantDefaultTheme})
            </span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-[var(--density-sm)]">
          {/* "Use school default" option */}
          <ThemeButton
            label={`School Default (${tenantDefaultTheme})`}
            isSelected={prefs.theme === null}
            onClick={() => updateField("theme", null)}
            icon={<SchoolIcon />}
          />

          {THEME_OPTIONS.map((option) => (
            <ThemeButton
              key={option.value}
              label={option.label}
              isSelected={prefs.theme === option.value}
              onClick={() => updateField("theme", option.value)}
              icon={<ThemeIcon mode={option.value} />}
            />
          ))}
        </div>
      </section>

      {/* ---- Density ---- */}
      <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-foreground">
          Layout Density
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          How much space between elements. Compact fits more on screen; spacious
          is easier on the eyes and better for touch.
          {prefs.density === null && (
            <span className="ml-1 text-[var(--text-xs)] italic">
              (Currently using school default: {tenantDefaultDensity})
            </span>
          )}
        </p>

        <div className="mt-4 space-y-[var(--density-sm)]">
          {/* School default option */}
          <DensityOption
            label={`School Default (${tenantDefaultDensity})`}
            description="Use the default set by your school administrator"
            isSelected={prefs.density === null}
            onSelect={() => updateField("density", null)}
          />

          {DENSITY_OPTIONS.map((option) => (
            <DensityOption
              key={option.value}
              label={option.label}
              description={option.description}
              isSelected={prefs.density === option.value}
              onSelect={() => updateField("density", option.value)}
            />
          ))}
        </div>
      </section>

      {/* ---- Font Scale ---- */}
      <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-foreground">
          Text Size
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Scale all text up or down across the platform.
        </p>

        <div className="mt-4 flex flex-wrap gap-[var(--density-sm)]">
          {FONT_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                updateField(
                  "fontScale",
                  option.value === "base" ? null : option.value,
                )
              }
              className={`
                rounded-lg border px-4 py-2 transition-all
                ${
                  (prefs.fontScale ?? "base") === option.value
                    ? "border-primary bg-primary/10 text-foreground font-semibold"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }
              `}
              style={{
                fontSize: `calc(var(--text-sm) * ${
                  option.value === "sm"
                    ? 0.9
                    : option.value === "base"
                      ? 1
                      : option.value === "lg"
                        ? 1.1
                        : 1.2
                })`,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Preview text */}
        <div className="mt-4 rounded-md border border-border/50 bg-muted/30 p-3">
          <p className="text-[var(--text-sm)] text-muted-foreground">
            Preview: This is how text will appear across WattleOS with your
            current settings.
          </p>
        </div>
      </section>

      {/* ---- Save ---- */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`
            rounded-lg bg-primary px-6 py-2.5 text-[var(--text-sm)] font-semibold
            text-primary-foreground shadow-sm transition-all
            hover:opacity-90 disabled:opacity-50
          `}
        >
          {isPending ? "Saving…" : "Save Preferences"}
        </button>

        {saveStatus === "saved" && (
          <span className="text-[var(--text-sm)] text-success animate-fade-in">
            Saved! Reloading…
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-[var(--text-sm)] text-destructive animate-fade-in">
            Failed to save. Please try again.
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ThemeButton({
  label,
  isSelected,
  onClick,
  icon,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2 rounded-lg border px-4 py-2 text-[var(--text-sm)] font-medium transition-all
        ${
          isSelected
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border bg-card text-muted-foreground hover:border-primary/50"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function DensityOption({
  label,
  description,
  isSelected,
  onSelect,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all
        ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50"
        }
      `}
    >
      <div
        className={`
          mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors
          ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}
        `}
      >
        {isSelected && (
          <div className="m-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </div>
      <div>
        <span className="block text-[var(--text-sm)] font-medium text-foreground">
          {label}
        </span>
        <span className="block text-[var(--text-xs)] text-muted-foreground">
          {description}
        </span>
      </div>
    </button>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
      />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
      />
    </svg>
  );
}
