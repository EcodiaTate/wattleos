// src/components/domain/admin/appearance-settings-client.tsx
//
// ============================================================
// WattleOS V2 — Appearance Settings Form (Client Component)
// ============================================================
// Interactive form for school appearance configuration.
// Uses 'use client' for the color picker, radio buttons,
// and live preview functionality.
//
// LIVE PREVIEW: Changes are applied to the DOM immediately
// (via data attributes and CSS variables) so the admin sees
// the effect before saving. On save, the server action
// persists to DB and updates the cookie.
// ============================================================

'use client';

import { useState, useTransition, useCallback } from 'react';
import { updateTenantDisplaySettings } from '@/lib/actions/display-settings';
import {
  type TenantDisplaySettings,
  type DensityMode,
  type ThemeMode,
  DENSITY_OPTIONS,
  THEME_OPTIONS,
} from '@/types/display';

interface AppearanceSettingsClientProps {
  initialSettings: TenantDisplaySettings;
}

export function AppearanceSettingsClient({
  initialSettings,
}: AppearanceSettingsClientProps) {
  const [settings, setSettings] = useState<TenantDisplaySettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // ---- Live preview helpers ----

  const applyPreview = useCallback((updated: TenantDisplaySettings) => {
    const html = document.documentElement;

    // Brand hue preview
    if (updated.brandHue !== null) {
      html.style.setProperty('--brand-hue', String(updated.brandHue));
    } else {
      html.style.removeProperty('--brand-hue');
    }

    if (updated.brandSaturation !== null) {
      html.style.setProperty('--brand-sat', `${updated.brandSaturation}%`);
    } else {
      html.style.removeProperty('--brand-sat');
    }

    // Density preview
    html.dataset.density = updated.defaultDensity;

    // Theme preview
    if (updated.defaultTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, []);

  const updateField = <K extends keyof TenantDisplaySettings>(
    key: K,
    value: TenantDisplaySettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    applyPreview(updated);
    setSaveStatus('idle');
  };

  // ---- Save ----

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateTenantDisplaySettings(settings);
      if (result.error) {
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        // Force page reload to pick up new cookie in root layout
        setTimeout(() => window.location.reload(), 800);
      }
    });
  };

  // ---- Hue presets (common school brand colors) ----

  const huePresets = [
    { label: 'Wattle Amber', hue: 38, sat: 92 },
    { label: 'Forest Green', hue: 152, sat: 50 },
    { label: 'Ocean Blue', hue: 210, sat: 65 },
    { label: 'Berry Purple', hue: 270, sat: 50 },
    { label: 'Sunset Red', hue: 355, sat: 70 },
    { label: 'Teal', hue: 180, sat: 50 },
    { label: 'Rose', hue: 340, sat: 60 },
    { label: 'Slate', hue: 215, sat: 20 },
  ];

  return (
    <div className="space-y-[var(--density-section-gap)] max-w-[var(--content-narrow-width)]">
      {/* ---- Brand Color ---- */}
      <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-foreground">
          Brand Colour
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Pick your school&apos;s primary colour. This tints buttons, links, and
          highlights across the platform.
        </p>

        {/* Preset swatches */}
        <div className="mt-4 flex flex-wrap gap-[var(--density-sm)]">
          {huePresets.map((preset) => {
            const isActive =
              settings.brandHue === preset.hue &&
              settings.brandSaturation === preset.sat;

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  updateField('brandHue', preset.hue);
                  updateField('brandSaturation', preset.sat);
                }}
                className={`
                  flex flex-col items-center gap-1 rounded-lg p-2 transition-all
                  ${isActive ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : 'hover:bg-muted'}
                `}
                title={preset.label}
              >
                <div
                  className="h-10 w-10 rounded-full border border-border"
                  style={{ background: `hsl(${preset.hue} ${preset.sat}% 50%)` }}
                />
                <span className="text-[var(--text-xs)] text-muted-foreground">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom hue slider */}
        <div className="mt-4 space-y-2">
          <label className="block text-[var(--text-sm)] font-medium text-foreground">
            Custom Hue: {settings.brandHue ?? 38}°
          </label>
          <input
            type="range"
            min={0}
            max={360}
            value={settings.brandHue ?? 38}
            onChange={(e) => updateField('brandHue', Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
            style={{
              background: `linear-gradient(to right, 
                hsl(0 80% 50%), hsl(60 80% 50%), hsl(120 80% 50%), 
                hsl(180 80% 50%), hsl(240 80% 50%), hsl(300 80% 50%), hsl(360 80% 50%))`,
              height: '8px',
              borderRadius: '4px',
            }}
          />
          {/* Preview bar showing the resolved primary */}
          <div
            className="h-3 w-full rounded-full"
            style={{
              background: `hsl(${settings.brandHue ?? 38} ${settings.brandSaturation ?? 92}% 50%)`,
            }}
          />
        </div>

        {/* Reset to default */}
        <button
          type="button"
          onClick={() => {
            updateField('brandHue', null);
            updateField('brandSaturation', null);
          }}
          className="mt-3 text-[var(--text-sm)] text-muted-foreground underline decoration-dotted hover:text-foreground"
        >
          Reset to Wattle Amber (default)
        </button>
      </section>

      {/* ---- Default Density ---- */}
      <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-foreground">
          Default Layout Density
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Controls spacing and sizing across the platform. Users can override this
          in their personal settings.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-[var(--density-sm)] sm:grid-cols-3">
          {DENSITY_OPTIONS.map((option) => (
            <DensityCard
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
              isSelected={settings.defaultDensity === option.value}
              onSelect={() => updateField('defaultDensity', option.value)}
            />
          ))}
        </div>
      </section>

      {/* ---- Default Theme ---- */}
      <section className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-foreground">
          Default Theme
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          The default appearance for all users. Each user can override this in their
          personal settings.
        </p>

        <div className="mt-4 flex flex-wrap gap-[var(--density-sm)]">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('defaultTheme', option.value)}
              className={`
                flex items-center gap-2 rounded-lg border px-4 py-2 text-[var(--text-sm)] font-medium transition-all
                ${settings.defaultTheme === option.value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              <ThemeIcon mode={option.value} />
              {option.label}
            </button>
          ))}
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
          {isPending ? 'Saving…' : 'Save Appearance'}
        </button>

        {saveStatus === 'saved' && (
          <span className="text-[var(--text-sm)] text-success animate-fade-in">
            Saved! Reloading…
          </span>
        )}
        {saveStatus === 'error' && (
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
  // Visual density preview: different sized bars
  const barSizes = {
    compact: ['h-1.5 w-12', 'h-1.5 w-8', 'h-1.5 w-10'],
    comfortable: ['h-2 w-14', 'h-2 w-10', 'h-2 w-12'],
    spacious: ['h-3 w-16', 'h-3 w-11', 'h-3 w-14'],
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        flex flex-col items-start gap-2 rounded-lg border p-[var(--density-card-padding)] text-left transition-all
        ${isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:border-primary/50'
        }
      `}
    >
      {/* Visual preview */}
      <div className="flex flex-col gap-1">
        {barSizes[value].map((size, i) => (
          <div
            key={i}
            className={`${size} rounded-full ${isSelected ? 'bg-primary/40' : 'bg-muted-foreground/20'}`}
          />
        ))}
      </div>

      <div>
        <span className="block text-[var(--text-sm)] font-semibold text-foreground">
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
  if (mode === 'light') {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
      </svg>
    );
  }
  // system
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
    </svg>
  );
}