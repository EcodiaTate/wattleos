"use client";

// src/components/domain/admin/ai-settings-client.tsx
//
// ============================================================
// WattleOS V2 - AI / Ask Wattle Settings (Prompt 38)
// ============================================================
// Consent acknowledgment UI for enabling sensitive data access
// in Ask Wattle (APP 8 — Cross-border disclosure compliance).
//
// Two flags controlled here:
//   ai_sensitive_data_enabled  — explicit opt-in consent gate
//   ai_disable_sensitive_tools — hard operational kill-switch
//
// WHY a separate component: The consent UI has its own loading/
// saving state, a distinct visual weight (warning colours), and
// a required checkbox before enabling. Mixing this into the
// general settings client would obscure the consent semantics.
// ============================================================

import { useCallback, useState } from "react";
import { updateTenantAiSettings } from "@/lib/actions/tenant-settings";
import type { TenantSettings } from "@/lib/constants/tenant-settings";

interface AiSettingsClientProps {
  initialSettings: TenantSettings;
}

export function AiSettingsClient({ initialSettings }: AiSettingsClientProps) {
  const [settings, setSettings] = useState<TenantSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Consent must be ticked before enabling sensitive data access
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const result = await updateTenantAiSettings({
      ai_sensitive_data_enabled: settings.ai_sensitive_data_enabled,
      ai_disable_sensitive_tools: settings.ai_disable_sensitive_tools,
    });

    setSaving(false);

    if (result.error) {
      setSaveError(result.error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }, [settings]);

  const toggleSensitiveData = useCallback((enabled: boolean) => {
    if (enabled && !consentAcknowledged) return; // Guard: must tick consent first
    setSettings((s) => ({ ...s, ai_sensitive_data_enabled: enabled }));
  }, [consentAcknowledged]);

  const toggleKillSwitch = useCallback((disabled: boolean) => {
    setSettings((s) => ({ ...s, ai_disable_sensitive_tools: disabled }));
  }, []);

  const canEnableSensitiveData = consentAcknowledged;
  const sensitiveEffectivelyEnabled =
    settings.ai_sensitive_data_enabled && !settings.ai_disable_sensitive_tools;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Ask Wattle — AI Data Access
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask Wattle (your AI assistant) can access sensitive student data to
          answer detailed questions. Because this data is processed by OpenAI
          servers in the United States, Australian Privacy Principle 8
          (cross-border disclosure) requires your explicit consent before
          enabling this feature.
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={
            sensitiveEffectivelyEnabled
              ? { background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }
              : { background: "var(--muted)", color: "var(--muted-foreground)" }
          }
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: sensitiveEffectivelyEnabled ? "var(--primary)" : "var(--muted-foreground)" }}
          />
          {sensitiveEffectivelyEnabled
            ? "Sensitive data access enabled"
            : settings.ai_disable_sensitive_tools
              ? "Kill-switch active — data access suspended"
              : "Sensitive data access disabled"}
        </span>
      </div>

      {/* APP 8 consent block */}
      <div
        className="rounded-lg border p-4 space-y-4"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: "color-mix(in srgb, orange 80%, var(--foreground))" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="text-sm space-y-1">
            <p className="font-medium text-foreground">
              Privacy disclosure — please read before enabling
            </p>
            <p className="text-muted-foreground">
              Enabling this feature allows Ask Wattle to access and process the
              following student data via OpenAI servers in the United States:
            </p>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5 text-xs">
              <li>Medical conditions, allergies, and management plans</li>
              <li>Custody restrictions and safety orders</li>
              <li>Emergency contacts</li>
              <li>Individual learning plans and wellbeing notes</li>
              <li>Student profile and attendance information</li>
            </ul>
            <p className="text-muted-foreground text-xs">
              OpenAI&apos;s data processing terms apply. Data may be processed
              outside Australia. You are responsible for ensuring your school
              community has been informed of this use.
            </p>
          </div>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentAcknowledged}
            onChange={(e) => {
              setConsentAcknowledged(e.target.checked);
              // If unchecking consent while enabled, disable sensitive data too
              if (!e.target.checked && settings.ai_sensitive_data_enabled) {
                setSettings((s) => ({ ...s, ai_sensitive_data_enabled: false }));
              }
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          />
          <span className="text-sm text-foreground">
            I understand that enabling this feature sends student data to OpenAI
            servers in the United States, and I have authority to consent on
            behalf of this school.
          </span>
        </label>
      </div>

      {/* Toggle: ai_sensitive_data_enabled */}
      <div
        className="flex items-center justify-between rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Enable sensitive data access for Ask Wattle
          </p>
          <p className="text-xs text-muted-foreground">
            Allows the AI assistant to access medical, custody, emergency, and
            student data when answering questions.
          </p>
          {!canEnableSensitiveData && (
            <p className="text-xs" style={{ color: "color-mix(in srgb, orange 70%, var(--foreground))" }}>
              You must acknowledge the privacy disclosure above before enabling.
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.ai_sensitive_data_enabled}
          disabled={!canEnableSensitiveData && !settings.ai_sensitive_data_enabled}
          onClick={() => toggleSensitiveData(!settings.ai_sensitive_data_enabled)}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: settings.ai_sensitive_data_enabled
              ? "var(--primary)"
              : "var(--muted)",
          }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            style={{
              transform: settings.ai_sensitive_data_enabled
                ? "translateX(24px)"
                : "translateX(2px)",
            }}
          />
        </button>
      </div>

      {/* Toggle: ai_disable_sensitive_tools (kill-switch) */}
      <div
        className="flex items-center justify-between rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Suspend sensitive data access (kill-switch)
          </p>
          <p className="text-xs text-muted-foreground">
            Immediately prevents Ask Wattle from accessing any sensitive student
            data, without revoking your consent. Use during audits or incidents.
            Your consent setting is preserved and can be re-activated at any time.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.ai_disable_sensitive_tools}
          onClick={() => toggleKillSwitch(!settings.ai_disable_sensitive_tools)}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
          style={{
            background: settings.ai_disable_sensitive_tools
              ? "color-mix(in srgb, orange 70%, var(--background))"
              : "var(--muted)",
          }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            style={{
              transform: settings.ai_disable_sensitive_tools
                ? "translateX(24px)"
                : "translateX(2px)",
            }}
          />
        </button>
      </div>

      {/* Save feedback */}
      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}
      {saveSuccess && (
        <p className="text-sm" style={{ color: "var(--primary)" }}>
          AI settings saved.
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {saving ? "Saving…" : "Save AI Settings"}
        </button>
      </div>
    </section>
  );
}
