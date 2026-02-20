// src/components/domain/admin/appearance-settings-client.tsx
//
// ============================================================
// WattleOS V2 — Appearance Settings Form (Client Component)
// ============================================================
// Full appearance configuration for school admins:
//   1. Brand colour — presets, sliders, hex input
//   2. Accent colour — presets, sliders, hex input
//   3. Sidebar style — light / dark / brand
//   4. Layout density — compact / comfortable / spacious
//   5. Default theme — light / dark / system
//
// LIVE PREVIEW: A sticky panel on the right shows a mini
// mockup of the WattleOS interface that updates in real-time.
// Changes are also applied to the actual DOM (via CSS custom
// properties) so the admin sees the whole page respond.
//
// SAVE STRATEGY: On save, the server action writes to DB AND
// updates the display cookie. We then call router.refresh()
// which re-runs server components (sidebar gets fresh props)
// WITHOUT destroying client state. The live preview CSS vars
// on <html> persist because React preserves client state
// during a soft refresh. No page reload needed.
// ============================================================

"use client";

import { updateTenantDisplaySettings } from "@/lib/actions/display-settings";
import {
  type ColorPreset,
  type DensityMode,
  type SidebarStyle,
  type TenantDisplaySettings,
  type ThemeMode,
  ACCENT_COLOR_PRESETS,
  BRAND_COLOR_PRESETS,
  DENSITY_OPTIONS,
  SIDEBAR_STYLE_OPTIONS,
  THEME_OPTIONS,
} from "@/types/display";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

// ============================================================
// Color Utilities
// ============================================================

/** Convert HSL to hex string. Lightness fixed at 50% for preview. */
function hslToHex(h: number, s: number, l: number = 50): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Parse hex (#RGB or #RRGGBB) to HSL. Returns null if invalid. */
function hexToHsl(
  hex: string,
): { h: number; s: number; l: number } | null {
  let clean = hex.replace(/^#/, "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) return null;

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Resolve effective hue/sat with fallback defaults. */
function resolveColor(
  hue: number | null,
  sat: number | null,
  defaultHue: number,
  defaultSat: number,
): { h: number; s: number } {
  return {
    h: hue ?? defaultHue,
    s: sat ?? defaultSat,
  };
}

// ============================================================
// Main Component
// ============================================================

interface AppearanceSettingsClientProps {
  initialSettings: TenantDisplaySettings;
}

export function AppearanceSettingsClient({
  initialSettings,
}: AppearanceSettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] =
    useState<TenantDisplaySettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  // Resolved colors for preview (with defaults applied)
  const brand = resolveColor(settings.brandHue, settings.brandSaturation, 38, 92);
  const accent = resolveColor(settings.accentHue, settings.accentSaturation, 152, 35);

  // ── Live preview: apply to DOM ────────────────────────────
  const applyPreview = useCallback((s: TenantDisplaySettings) => {
    const html = document.documentElement;
    const b = resolveColor(s.brandHue, s.brandSaturation, 38, 92);
    const a = resolveColor(s.accentHue, s.accentSaturation, 152, 35);

    // Brand color
    html.style.setProperty("--brand-hue", String(b.h));
    html.style.setProperty("--brand-sat", `${b.s}%`);

    // Accent color
    html.style.setProperty("--accent-hue", String(a.h));
    html.style.setProperty("--accent-sat", `${a.s}%`);

    // Density
    html.dataset.density = s.defaultDensity;

    // Theme
    if (s.defaultTheme === "dark") {
      html.classList.add("dark");
    } else if (s.defaultTheme === "light") {
      html.classList.remove("dark");
    }
    // "system" — leave as-is (respects prefers-color-scheme)
  }, []);

  // Apply on mount + whenever settings change
  useEffect(() => {
    applyPreview(settings);
  }, [settings, applyPreview]);

  // ── Update helper (atomic) ────────────────────────────────
  const updateSettings = (partial: Partial<TenantDisplaySettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSaveStatus("idle");
  };

  // ── Save ──────────────────────────────────────────────────
  // WHY router.refresh() instead of window.location.reload():
  // reload() destroys all client state — the CSS vars the live
  // preview set on <html> get wiped and replaced by whatever
  // the cookie says. Even with the cookie fix, there's a race
  // condition. router.refresh() re-runs server components (so
  // the sidebar gets fresh props) WITHOUT destroying client
  // state. The live preview CSS vars persist on <html>.
  const handleSave = () => {
    startTransition(async () => {
      const result = await updateTenantDisplaySettings(settings);
      if (result.error) {
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        // Re-run server components so sidebar picks up new
        // sidebarStyle/brandHue/brandSat props from the (app)
        // layout, which re-reads from DB. Client state (and
        // the CSS vars on <html>) are preserved.
        router.refresh();
      }
    });
  };

  // ── Layout: controls left, preview right ──────────────────
  return (
    <div className="flex flex-col gap-[var(--density-section-gap)] lg:flex-row lg:items-start">
      {/* ════ Left column: controls ════ */}
      <div className="flex-1 space-y-[var(--density-section-gap)] min-w-0">
        {/* ── 1. Brand Colour ── */}
        <ColorSection
          title="Brand Colour"
          description="Your school's primary colour. Tints buttons, links, navigation, and highlights across the platform."
          presets={BRAND_COLOR_PRESETS}
          hue={brand.h}
          saturation={brand.s}
          defaultHue={38}
          defaultSat={92}
          defaultLabel="Wattle Gold"
          onChange={(h, s) =>
            updateSettings({ brandHue: h, brandSaturation: s })
          }
          onReset={() =>
            updateSettings({ brandHue: null, brandSaturation: null })
          }
        />

        {/* ── 2. Accent Colour ── */}
        <ColorSection
          title="Accent Colour"
          description="Secondary colour for success states, badges, and highlights. Should complement your brand colour."
          presets={ACCENT_COLOR_PRESETS}
          hue={accent.h}
          saturation={accent.s}
          defaultHue={152}
          defaultSat={35}
          defaultLabel="Eucalyptus"
          onChange={(h, s) =>
            updateSettings({ accentHue: h, accentSaturation: s })
          }
          onReset={() =>
            updateSettings({ accentHue: null, accentSaturation: null })
          }
        />

        {/* ── 3. Sidebar Style ── */}
        <SettingsCard title="Sidebar Style" description="Controls the visual weight and contrast of the navigation sidebar.">
          <div className="grid grid-cols-1 gap-[var(--density-sm)] sm:grid-cols-3">
            {SIDEBAR_STYLE_OPTIONS.map((opt) => (
              <SidebarStyleCard
                key={opt.value}
                value={opt.value}
                label={opt.label}
                description={opt.description}
                brandHue={brand.h}
                brandSat={brand.s}
                isSelected={settings.sidebarStyle === opt.value}
                onSelect={() => updateSettings({ sidebarStyle: opt.value })}
              />
            ))}
          </div>
        </SettingsCard>

        {/* ── 4. Layout Density ── */}
        <SettingsCard title="Layout Density" description="Controls spacing and sizing across the platform. Users can override this in their personal settings.">
          <div className="grid grid-cols-1 gap-[var(--density-sm)] sm:grid-cols-3">
            {DENSITY_OPTIONS.map((opt) => (
              <DensityCard
                key={opt.value}
                value={opt.value}
                label={opt.label}
                description={opt.description}
                isSelected={settings.defaultDensity === opt.value}
                onSelect={() => updateSettings({ defaultDensity: opt.value })}
              />
            ))}
          </div>
        </SettingsCard>

        {/* ── 5. Default Theme ── */}
        <SettingsCard title="Default Theme" description="The default appearance for all users. Each user can override this in their personal settings.">
          <div className="flex flex-wrap gap-[var(--density-sm)]">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSettings({ defaultTheme: opt.value })}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  settings.defaultTheme === opt.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                <ThemeIcon mode={opt.value} />
                {opt.label}
              </button>
            ))}
          </div>
        </SettingsCard>

        {/* ── Save ── */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Appearance"}
          </button>

          {saveStatus === "saved" && (
            <span className="text-sm text-success animate-fade-in">
              ✓ Saved successfully
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-destructive animate-fade-in">
              Failed to save. Please try again.
            </span>
          )}
        </div>
      </div>

      {/* ════ Right column: live preview ════ */}
      <div className="hidden lg:block lg:w-80 xl:w-96 lg:sticky lg:top-20 shrink-0">
        <LivePreview
          brandHue={brand.h}
          brandSat={brand.s}
          accentHue={accent.h}
          accentSat={accent.s}
          sidebarStyle={settings.sidebarStyle}
          density={settings.defaultDensity}
          theme={settings.defaultTheme}
        />
      </div>
    </div>
  );
}

// ============================================================
// Settings Card Wrapper
// ============================================================

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ============================================================
// Color Section (Brand or Accent)
// ============================================================
function ColorSection({
  title,
  description,
  presets,
  hue,
  saturation,
  defaultHue,
  defaultSat,
  defaultLabel,
  onChange,
  onReset,
}: {
  title: string;
  description: string;
  presets: ReadonlyArray<ColorPreset>;
  hue: number;
  saturation: number;
  defaultHue: number;
  defaultSat: number;
  defaultLabel: string;
  onChange: (hue: number, saturation: number) => void;
  onReset: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);

  // Draft hex string the user is typing
  const [hexInput, setHexInput] = useState(() => hslToHex(hue, saturation));
  const [isEditingHex, setIsEditingHex] = useState(false);

  // ── helpers ────────────────────────────────────────────────
  const sanitizeHexDraft = (raw: string) => {
    // allow typing with or without '#'
    let s = raw.trim();
    if (s.startsWith("#")) s = s.slice(1);

    // keep only hex chars, max 6
    s = s.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);

    // always show leading '#'
    return `#${s}`;
  };

  const parseHexLenient = (raw: string) => {
    // accepts #RGB, RGB, #RRGGBB, RRGGBB
    const s = raw.trim().replace(/^#/, "");
    if (s.length === 3 || s.length === 6) {
      return hexToHsl(`#${s}`);
    }
    return null;
  };

  const normalizeHex = (raw: string) => {
    // If valid, return full #RRGGBB (expands #RGB)
    let s = raw.trim().replace(/^#/, "");
    if (s.length === 3) {
      s = s
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (s.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return `#${s.toUpperCase()}`;
  };

  // Sync hex input when hue/sat change from presets/sliders,
  // but DON'T clobber the user's in-progress typing.
  useEffect(() => {
    if (isEditingHex) return;
    setHexInput(hslToHex(hue, saturation));
  }, [hue, saturation, isEditingHex]);

  const handleHexChange = (raw: string) => {
    const draft = sanitizeHexDraft(raw);
    setHexInput(draft);

    // Only push into HSL once it becomes a complete valid hex (3 or 6 digits)
    const parsed = parseHexLenient(draft);
    if (parsed) {
      onChange(parsed.h, parsed.s);
    }
  };

  const handleHexBlur = () => {
    setIsEditingHex(false);

    // If it's valid, normalize formatting (uppercase + full 6 digits)
    const normalized = normalizeHex(hexInput);
    if (normalized) {
      setHexInput(normalized);
      const parsed = hexToHsl(normalized);
      if (parsed) onChange(parsed.h, parsed.s);
      return;
    }

    // Otherwise revert to current computed color
    setHexInput(hslToHex(hue, saturation));
  };

  const isDefault = hue === defaultHue && saturation === defaultSat;

  return (
    <SettingsCard title={title} description={description}>
      {/* ── Preview swatch + hex ── */}
      <div className="mb-4 flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-xl border-2 border-border shadow-sm shrink-0"
          style={{ background: `hsl(${hue} ${saturation}% 50%)` }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {presets.find((p) => p.hue === hue && p.saturation === saturation)?.label ??
                "Custom"}
            </span>
            {!isDefault && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setIsEditingHex(false);
                  setHexInput(hslToHex(defaultHue, defaultSat));
                }}
                className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
              >
                Reset to {defaultLabel}
              </button>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor={`${title}-hex`}>
              Hex
            </label>
            <input
              id={`${title}-hex`}
              type="text"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={hexInput}
              onFocus={() => setIsEditingHex(true)}
              onBlur={handleHexBlur}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#F5A623"
              // We always store "#"+ up to 6 chars => max 7
              maxLength={7}
              className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* ── Preset swatches ── */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
        {presets.map((preset) => {
          const isActive = hue === preset.hue && saturation === preset.saturation;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onChange(preset.hue, preset.saturation);
                setShowCustom(false);
                setIsEditingHex(false);
                setHexInput(hslToHex(preset.hue, preset.saturation));
              }}
              className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all ${
                isActive
                  ? "bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "hover:bg-muted"
              }`}
              title={preset.label}
            >
              <div
                className={`h-9 w-9 rounded-full border-2 transition-transform group-hover:scale-110 ${
                  isActive ? "border-primary" : "border-border"
                }`}
                style={{
                  background: `hsl(${preset.hue} ${preset.saturation}% 50%)`,
                }}
              />
              <span className="text-[10px] leading-tight text-center text-muted-foreground line-clamp-1">
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Custom toggle ── */}
      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${showCustom ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        Fine-tune with sliders
      </button>

      {/* ── Custom sliders (collapsed by default) ── */}
      {showCustom && (
        <div className="mt-3 space-y-3 animate-fade-in-up">
          {/* Hue slider */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Hue</span>
              <span className="font-mono tabular-nums">{hue}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => onChange(Number(e.target.value), saturation)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-foreground/30 [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: `linear-gradient(to right, hsl(0 ${saturation}% 50%), hsl(60 ${saturation}% 50%), hsl(120 ${saturation}% 50%), hsl(180 ${saturation}% 50%), hsl(240 ${saturation}% 50%), hsl(300 ${saturation}% 50%), hsl(360 ${saturation}% 50%))`,
              }}
            />
          </div>

          {/* Saturation slider */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Saturation</span>
              <span className="font-mono tabular-nums">{saturation}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={saturation}
              onChange={(e) => onChange(hue, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-foreground/30 [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: `linear-gradient(to right, hsl(${hue} 10% 50%), hsl(${hue} 100% 50%))`,
              }}
            />
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
// ============================================================
// Sidebar Style Card
// ============================================================

function SidebarStyleCard({
  value,
  label,
  description,
  brandHue,
  brandSat,
  isSelected,
  onSelect,
}: {
  value: SidebarStyle;
  label: string;
  description: string;
  brandHue: number;
  brandSat: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const sidebarColors = {
    light: { bg: "hsl(40 20% 96%)", fg: "hsl(30 10% 45%)", active: `hsl(${brandHue} ${brandSat}% 50%)` },
    dark: { bg: "hsl(25 12% 12%)", fg: "hsl(35 12% 65%)", active: `hsl(${brandHue} ${brandSat}% 55%)` },
    brand: { bg: `hsl(${brandHue} ${brandSat}% 30%)`, fg: `hsl(${brandHue} 20% 85%)`, active: `hsl(${brandHue} ${brandSat}% 50%)` },
  };
  const c = sidebarColors[value];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-start gap-3 rounded-lg border p-[var(--density-card-padding)] text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div
        className="w-full h-20 rounded-md flex flex-col gap-1.5 p-2"
        style={{ background: c.bg }}
      >
        {[0.7, 1, 0.6].map((opacity, i) => (
          <div
            key={i}
            className="h-2 rounded-full"
            style={{
              background: i === 1 ? c.active : c.fg,
              opacity: i === 1 ? 1 : opacity,
              width: i === 1 ? "80%" : `${55 + i * 15}%`,
            }}
          />
        ))}
      </div>
      <div>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </div>
    </button>
  );
}

// ============================================================
// Density Card
// ============================================================

function DensityCard({
  value,
  label,
  description,
  isSelected,
  onSelect,
}: {
  value: DensityMode;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const barSizes: Record<DensityMode, string[]> = {
    compact: ["h-1 w-10", "h-1 w-7", "h-1 w-9"],
    comfortable: ["h-1.5 w-12", "h-1.5 w-9", "h-1.5 w-11"],
    spacious: ["h-2.5 w-14", "h-2.5 w-10", "h-2.5 w-13"],
  };
  const gapSizes: Record<DensityMode, string> = {
    compact: "gap-0.5",
    comfortable: "gap-1",
    spacious: "gap-2",
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-start gap-3 rounded-lg border p-[var(--density-card-padding)] text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className={`flex flex-col ${gapSizes[value]}`}>
        {barSizes[value].map((size, i) => (
          <div
            key={i}
            className={`${size} rounded-full ${
              isSelected ? "bg-primary/40" : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>
      <div>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </div>
    </button>
  );
}

// ============================================================
// Theme Icon
// ============================================================

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  const paths: Record<ThemeMode, string> = {
    light:
      "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z",
    dark:
      "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z",
    system:
      "M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25",
  };

  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[mode]} />
    </svg>
  );
}

// ============================================================
// Live Preview Panel
// ============================================================

function LivePreview({
  brandHue,
  brandSat,
  accentHue,
  accentSat,
  sidebarStyle,
  density,
  theme,
}: {
  brandHue: number;
  brandSat: number;
  accentHue: number;
  accentSat: number;
  sidebarStyle: SidebarStyle;
  density: DensityMode;
  theme: ThemeMode;
}) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const primary = `hsl(${brandHue} ${brandSat}% ${isDark ? 55 : 50}%)`;
  const primaryLight = `hsl(${brandHue} ${brandSat}% ${isDark ? 15 : 95}%)`;
  const accentColor = `hsl(${accentHue} ${accentSat}% ${isDark ? 35 : 42}%)`;
  const contentBg = isDark ? "hsl(25 15% 8%)" : "hsl(40 30% 98%)";
  const cardBg = isDark ? "hsl(25 12% 11%)" : "hsl(40 25% 99%)";
  const textPrimary = isDark ? "hsl(35 15% 90%)" : "hsl(30 10% 12%)";
  const textMuted = isDark ? "hsl(30 8% 55%)" : "hsl(30 8% 46%)";
  const borderColor = isDark ? "hsl(25 10% 18%)" : "hsl(35 15% 88%)";

  const sidebarBg = {
    light: isDark ? "hsl(25 12% 10%)" : "hsl(40 20% 96%)",
    dark: "hsl(25 12% 10%)",
    brand: `hsl(${brandHue} ${Math.max(brandSat - 20, 15)}% ${isDark ? 14 : 22}%)`,
  }[sidebarStyle];

  const sidebarFg = {
    light: isDark ? "hsl(35 12% 65%)" : "hsl(30 10% 50%)",
    dark: "hsl(35 12% 65%)",
    brand: `hsl(${brandHue} 15% 78%)`,
  }[sidebarStyle];

  const sidebarActiveBg = {
    light: primaryLight,
    dark: `hsl(${brandHue} ${brandSat}% 18%)`,
    brand: `hsl(${brandHue} ${brandSat}% ${isDark ? 22 : 30}%)`,
  }[sidebarStyle];

  const pad = { compact: "6px", comfortable: "10px", spacious: "14px" }[density];
  const gap = { compact: "4px", comfortable: "8px", spacious: "12px" }[density];
  const textSm = { compact: "9px", comfortable: "10px", spacious: "11px" }[density];
  const textXs = { compact: "7px", comfortable: "8px", spacious: "9px" }[density];

  return (
    <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
      <h3 className="text-sm font-semibold text-foreground mb-3">Live Preview</h3>

      <div
        className="rounded-lg overflow-hidden border"
        style={{ borderColor, fontSize: textSm, lineHeight: 1.4 }}
      >
        <div className="flex" style={{ height: "280px" }}>
          {/* Mini sidebar */}
          <div
            className="shrink-0 flex flex-col"
            style={{
              width: "72px",
              background: sidebarBg,
              padding: pad,
              gap,
              borderRight: `1px solid ${borderColor}`,
            }}
          >
            <div
              className="rounded-md flex items-center justify-center font-bold"
              style={{
                height: "22px",
                background: primary,
                color: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                fontSize: textXs,
              }}
            >
              W
            </div>

            {["Dashboard", "Students", "Classes", "Observe"].map((item, i) => (
              <div
                key={item}
                className="rounded-md truncate"
                style={{
                  padding: `3px ${pad}`,
                  fontSize: textXs,
                  background: i === 0 ? sidebarActiveBg : "transparent",
                  color: i === 0 ? primary : sidebarFg,
                  fontWeight: i === 0 ? 600 : 400,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Mini content */}
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: contentBg, padding: pad, gap }}
          >
            <div style={{ color: textPrimary, fontWeight: 600, fontSize: textSm }}>
              Dashboard
            </div>

            <div className="flex" style={{ gap }}>
              {[
                { label: "Students", value: "48", color: primary },
                { label: "Present", value: "45", color: accentColor },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 rounded-md"
                  style={{
                    background: cardBg,
                    border: `1px solid ${borderColor}`,
                    padding: pad,
                  }}
                >
                  <div style={{ color: textMuted, fontSize: textXs }}>{stat.label}</div>
                  <div style={{ color: stat.color, fontWeight: 700, fontSize: "13px" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex-1 rounded-md"
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                padding: pad,
              }}
            >
              <div style={{ color: textPrimary, fontWeight: 600, fontSize: textXs, marginBottom: gap }}>
                Recent Observations
              </div>

              {["Mila explored the pink tower…", "Leo counted beads to 100…"].map((text, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{
                    gap,
                    padding: "3px 0",
                    borderTop: i > 0 ? `1px solid ${borderColor}` : "none",
                  }}
                >
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: "16px",
                      height: "16px",
                      background: i === 0 ? primary : accentColor,
                    }}
                  />
                  <div className="truncate" style={{ color: textMuted, fontSize: textXs }}>
                    {text}
                  </div>
                </div>
              ))}

              <div className="flex mt-1" style={{ gap: "4px" }}>
                <span
                  className="rounded-full"
                  style={{
                    background: `hsl(${accentHue} ${accentSat}% ${isDark ? 20 : 92}%)`,
                    color: accentColor,
                    fontSize: "7px",
                    fontWeight: 600,
                    padding: "1px 6px",
                  }}
                >
                  Mastered
                </span>
                <span
                  className="rounded-full"
                  style={{
                    background: primaryLight,
                    color: primary,
                    fontSize: "7px",
                    fontWeight: 600,
                    padding: "1px 6px",
                  }}
                >
                  Practicing
                </span>
              </div>
            </div>

            <div className="flex" style={{ gap }}>
              <div
                className="rounded-md text-center"
                style={{
                  background: primary,
                  color: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                  padding: `3px ${pad}`,
                  fontWeight: 600,
                  fontSize: textXs,
                  flex: 1,
                }}
              >
                Primary
              </div>
              <div
                className="rounded-md text-center"
                style={{
                  background: "transparent",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: `3px ${pad}`,
                  fontWeight: 500,
                  fontSize: textXs,
                  flex: 1,
                }}
              >
                Secondary
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground text-center">
        Preview updates as you change settings
      </p>
    </div>
  );
}