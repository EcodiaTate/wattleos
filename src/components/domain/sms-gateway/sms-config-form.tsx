"use client";

// src/components/domain/sms-gateway/sms-config-form.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSmsGatewayConfig } from "@/lib/actions/sms-gateway";
import type { SmsGatewayConfigSafe } from "@/types/domain";
import { SMS_PROVIDER_OPTIONS, SMS_DEFAULT_DAILY_LIMIT } from "@/lib/constants/sms-gateway";
import type { UpsertSmsConfigInput } from "@/lib/validations/sms-gateway";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  existing: SmsGatewayConfigSafe | null;
}

export function SmsConfigForm({ existing }: Props) {
  const router   = useRouter();
  const haptics  = useHaptics();
  const [pending, startTransition] = useTransition();

  const [provider,    setProvider]    = useState<"messagemedia" | "burst">(existing?.provider ?? "messagemedia");
  const [apiKey,      setApiKey]      = useState("");
  const [apiSecret,   setApiSecret]   = useState("");
  const [senderId,    setSenderId]    = useState(existing?.sender_id ?? "WattleOS");
  const [enabled,     setEnabled]     = useState(existing?.enabled ?? false);
  const [dailyLimit,  setDailyLimit]  = useState(existing?.daily_limit ?? SMS_DEFAULT_DAILY_LIMIT);
  const [error,       setError]       = useState<string | null>(null);
  const [saved,       setSaved]       = useState(false);

  const needsSecret = SMS_PROVIDER_OPTIONS.find((p) => p.value === provider)?.needs_secret ?? false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    haptics.impact("medium");

    const input: UpsertSmsConfigInput = {
      provider,
      api_key:     apiKey,
      api_secret:  apiSecret || undefined,
      sender_id:   senderId,
      enabled,
      daily_limit: dailyLimit,
    };

    startTransition(async () => {
      const result = await upsertSmsGatewayConfig(input);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        setSaved(true);
        haptics.success();
        setApiKey("");
        setApiSecret("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Provider */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          SMS Provider
        </label>
        <div className="flex gap-3">
          {SMS_PROVIDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setProvider(opt.value); haptics.impact("light"); }}
              className="flex-1 rounded-xl border p-3 text-left transition-all active-push touch-target"
              style={{
                borderColor: provider === opt.value ? "var(--primary)" : "var(--border)",
                background:  provider === opt.value ? "var(--primary-muted)" : "var(--card)",
                color:       "var(--foreground)",
              }}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          API Key {existing?.has_api_key && <span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>(leave blank to keep existing)</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={existing?.has_api_key ? "••••••••••••" : "Enter API key"}
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            background:  "var(--input)",
            borderColor: "var(--border)",
            color:       "var(--foreground)",
          }}
        />
      </div>

      {/* API Secret (MessageMedia only) */}
      {needsSecret && (
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            API Secret {existing?.has_api_key && <span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>(leave blank to keep existing)</span>}
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={existing?.has_api_key ? "••••••••••••" : "Enter API secret"}
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{
              background:  "var(--input)",
              borderColor: "var(--border)",
              color:       "var(--foreground)",
            }}
          />
        </div>
      )}

      {/* Sender ID */}
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Sender ID <span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>(max 11 chars)</span>
        </label>
        <input
          type="text"
          value={senderId}
          onChange={(e) => setSenderId(e.target.value.slice(0, 11))}
          placeholder="WattleOS"
          maxLength={11}
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            background:  "var(--input)",
            borderColor: "var(--border)",
            color:       "var(--foreground)",
          }}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Displayed as the sender name on recipients&apos; phones.
        </p>
      </div>

      {/* Daily limit */}
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Daily Send Limit
        </label>
        <input
          type="number"
          value={dailyLimit}
          onChange={(e) => setDailyLimit(Number(e.target.value))}
          min={1}
          max={50000}
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            background:  "var(--input)",
            borderColor: "var(--border)",
            color:       "var(--foreground)",
          }}
        />
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Gateway Enabled</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            When disabled, no SMS messages will be sent.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => { setEnabled(!enabled); haptics.impact("light"); }}
          className="relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2"
          style={{ background: enabled ? "var(--primary)" : "var(--muted)" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ left: enabled ? "calc(100% - 1.375rem)" : "0.125rem" }}
          />
        </button>
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--sms-failed-bg)", color: "var(--sms-failed-fg)" }}>
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--sms-delivered-bg)", color: "var(--sms-delivered-fg)" }}>
          Configuration saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all active-push touch-target"
        style={{
          background:  "var(--primary)",
          color:       "var(--primary-foreground)",
          opacity:     pending ? 0.7 : 1,
        }}
      >
        {pending ? "Saving…" : "Save Configuration"}
      </button>
    </form>
  );
}
