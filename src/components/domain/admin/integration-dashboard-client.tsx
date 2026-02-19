// src/components/domain/admin/integration-dashboard-client.tsx
//
// ============================================================
// WattleOS V2 - Integration Dashboard (Client Component)
// ============================================================
// Shows all available integrations as cards. Each card can be
// expanded to configure credentials, test connection, and view
// recent sync logs.
//
// Form fields are generated dynamically from the provider
// definitions in constants/integrations.ts - no hardcoded
// forms per provider.
// ============================================================

"use client";

import {
  deleteIntegrationConfig,
  listIntegrationConfigs,
  listSyncLogs,
  saveIntegrationConfig,
  testIntegrationConnection,
} from "@/lib/actions/integrations";
import type {
  CredentialField,
  IntegrationProvider,
  ProviderDefinition,
  SettingField,
} from "@/lib/constants/integrations";
import {
  INTEGRATION_PROVIDER_LIST,
  SYNC_STATUS_CONFIG,
} from "@/lib/constants/integrations";
import type { IntegrationConfig, IntegrationSyncLog } from "@/types/domain";
import { useState } from "react";

interface IntegrationDashboardClientProps {
  existingConfigs: IntegrationConfig[];
}

export function IntegrationDashboardClient({
  existingConfigs,
}: IntegrationDashboardClientProps) {
  const [configs, setConfigs] = useState(existingConfigs);
  const [expandedProvider, setExpandedProvider] =
    useState<IntegrationProvider | null>(null);
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  function getConfig(
    provider: IntegrationProvider,
  ): IntegrationConfig | undefined {
    return configs.find((c) => c.provider === provider);
  }

  async function handleLoadLogs(provider: IntegrationProvider) {
    const result = await listSyncLogs({ provider, limit: 20 });
    setSyncLogs(result.data ?? []);
    setShowLogs(true);
  }

  async function handleRefreshConfigs() {
    const result = await listIntegrationConfigs();
    if (result.data) setConfigs(result.data);
  }

  return (
    <div className="space-y-4">
      {/* Provider cards */}
      {INTEGRATION_PROVIDER_LIST.map((provider) => {
        const config = getConfig(provider.key);
        const isExpanded = expandedProvider === provider.key;

        return (
          <div
            key={provider.key}
            className={`rounded-lg border bg-white shadow-sm transition-all ${
              config?.is_enabled ? "border-green-200" : "border-gray-200"
            }`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${provider.bgColor}`}
                >
                  {provider.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {provider.label}
                    </h3>
                    {config?.is_enabled && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Connected
                      </span>
                    )}
                    {!provider.implemented && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {provider.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {config?.is_enabled && (
                  <button
                    onClick={() => handleLoadLogs(provider.key)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Sync Logs
                  </button>
                )}
                <button
                  onClick={() =>
                    setExpandedProvider(isExpanded ? null : provider.key)
                  }
                  disabled={!provider.implemented}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {isExpanded ? "Close" : config ? "Configure" : "Set Up"}
                </button>
              </div>
            </div>

            {/* Expanded config form */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-6 py-5">
                <IntegrationConfigForm
                  provider={provider}
                  existingConfig={config}
                  onSaved={() => {
                    handleRefreshConfigs();
                    setExpandedProvider(null);
                  }}
                  onDeleted={() => {
                    handleRefreshConfigs();
                    setExpandedProvider(null);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Sync Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Sync Logs</h3>
              <button
                onClick={() => setShowLogs(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {syncLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No sync logs found.</p>
              ) : (
                <div className="space-y-3">
                  {syncLogs.map((log) => {
                    const statusConfig = SYNC_STATUS_CONFIG[log.status];
                    return (
                      <div
                        key={log.id}
                        className="rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {log.operation}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(log.created_at).toLocaleString("en-AU")}
                          </span>
                        </div>
                        {log.entity_type && (
                          <p className="mt-1 text-xs text-gray-500">
                            {log.entity_type}{" "}
                            {log.entity_id
                              ? `(${log.entity_id.slice(0, 8)}...)`
                              : ""}
                          </p>
                        )}
                        {log.error_message && (
                          <p className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700">
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CONFIG FORM - dynamically generated from provider definitions
// ============================================================

interface IntegrationConfigFormProps {
  provider: ProviderDefinition;
  existingConfig?: IntegrationConfig;
  onSaved: () => void;
  onDeleted: () => void;
}

function IntegrationConfigForm({
  provider,
  existingConfig,
  onSaved,
  onDeleted,
}: IntegrationConfigFormProps) {
  const existingCreds = (existingConfig?.credentials ?? {}) as Record<
    string,
    string
  >;
  const existingSettings = (existingConfig?.settings ?? {}) as Record<
    string,
    string | boolean
  >;

  const [credentials, setCredentials] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of provider.credentialFields) {
      initial[field.key] = (existingCreds[field.key] as string) ?? "";
    }
    return initial;
  });

  const [settings, setSettings] = useState<Record<string, string | boolean>>(
    () => {
      const initial: Record<string, string | boolean> = {};
      for (const field of provider.settingFields) {
        initial[field.key] = existingSettings[field.key] ?? field.defaultValue;
      }
      return initial;
    },
  );

  const [isEnabled, setIsEnabled] = useState(
    existingConfig?.is_enabled ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateCredential(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }

  function updateSetting(key: string, value: string | boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    // Validate required fields
    for (const field of provider.credentialFields) {
      if (field.required && !credentials[field.key]?.trim()) {
        setError(`${field.label} is required`);
        setIsSaving(false);
        return;
      }
    }

    const result = await saveIntegrationConfig({
      provider: provider.key,
      is_enabled: isEnabled,
      credentials,
      settings,
    });

    setIsSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onSaved();
  }

  async function handleTest() {
    setTestResult(null);
    setIsTesting(true);

    // Save first so the test uses current credentials
    const saveResult = await saveIntegrationConfig({
      provider: provider.key,
      is_enabled: isEnabled,
      credentials,
      settings,
    });

    if (saveResult.error) {
      setTestResult({ connected: false, message: saveResult.error.message });
      setIsTesting(false);
      return;
    }

    const result = await testIntegrationConnection(provider.key);
    setIsTesting(false);

    if (result.data) {
      setTestResult(result.data);
    } else {
      setTestResult({
        connected: false,
        message: result.error?.message ?? "Test failed",
      });
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Remove the ${provider.label} integration? This will delete all saved credentials.`,
      )
    ) {
      return;
    }

    const result = await deleteIntegrationConfig(provider.key);
    if (result.data) {
      onDeleted();
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {testResult && (
        <div
          className={`rounded-md p-3 ${testResult.connected ? "bg-green-50" : "bg-red-50"}`}
        >
          <p
            className={`text-sm font-medium ${testResult.connected ? "text-green-700" : "text-red-700"}`}
          >
            {testResult.connected ? "✓ " : "✗ "}
            {testResult.message}
          </p>
        </div>
      )}

      {/* Enable toggle */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
        <span className="text-sm font-medium text-gray-700">
          Enable {provider.label} integration
        </span>
      </label>

      {/* Credential fields */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900">Credentials</h4>
        <div className="mt-3 space-y-4">
          {provider.credentialFields.map((field) => (
            <CredentialInput
              key={field.key}
              field={field}
              value={credentials[field.key] ?? ""}
              onChange={(val) => updateCredential(field.key, val)}
            />
          ))}
        </div>
      </div>

      {/* Setting fields */}
      {provider.settingFields.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Settings</h4>
          <div className="mt-3 space-y-4">
            {provider.settingFields.map((field) => (
              <SettingInput
                key={field.key}
                field={field}
                value={settings[field.key] ?? field.defaultValue}
                onChange={(val) => updateSetting(field.key, val)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
        <button
          onClick={handleTest}
          disabled={isTesting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isTesting ? "Testing..." : "Test Connection"}
        </button>
        {existingConfig && (
          <button
            onClick={handleDelete}
            className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            Remove Integration
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FIELD RENDERERS
// ============================================================

function CredentialInput({
  field,
  value,
  onChange,
}: {
  field: CredentialField;
  value: string;
  onChange: (val: string) => void;
}) {
  const baseClasses =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={`${baseClasses} font-mono text-xs`}
        />
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseClasses}
        />
      )}
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}

function SettingInput({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: string | boolean;
  onChange: (val: string | boolean) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">
            {field.label}
          </span>
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
        </div>
      </label>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
      </label>
      <input
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
