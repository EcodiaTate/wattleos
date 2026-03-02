"use client";

// src/app/(app)/admin/admissions/portal/inquiry-config-client.tsx
//
// ============================================================
// WattleOS V2 - Inquiry Form Config Admin UI
// ============================================================
// Allows admins to configure the public /inquiry page:
//   - Welcome + confirmation messages
//   - Toggle optional built-in fields on/off
//   - Add/remove/reorder custom questions
//   - Edit referral source options
// ============================================================

import { updateInquiryConfig } from "@/lib/actions/admissions/inquiry-config";
import type { CustomField, InquiryConfig } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface InquiryConfigClientProps {
  initialConfig: InquiryConfig;
}

function newFieldId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function InquiryConfigClient({ initialConfig }: InquiryConfigClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Messages
  const [welcomeMessage, setWelcomeMessage] = useState(initialConfig.welcome_message ?? "");
  const [confirmationMessage, setConfirmationMessage] = useState(initialConfig.confirmation_message ?? "");

  // Field toggles
  const [toggles, setToggles] = useState(initialConfig.field_toggles);

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>(initialConfig.custom_fields);

  // Referral sources (comma-editable)
  const [referralSources, setReferralSources] = useState<string[]>(initialConfig.referral_sources);
  const [referralInput, setReferralInput] = useState(initialConfig.referral_sources.join("\n"));

  function toggle(key: keyof typeof toggles) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addCustomField() {
    setCustomFields((prev) => [
      ...prev,
      { id: newFieldId(), label: "", type: "text", required: false },
    ]);
  }

  function updateCustomField(index: number, patch: Partial<CustomField>) {
    setCustomFields((prev) =>
      prev.map((cf, i) => (i === index ? ({ ...cf, ...patch } as CustomField) : cf)),
    );
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleReferralBlur() {
    const sources = referralInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setReferralSources(sources);
  }

  async function handleSave() {
    setErrorMsg(null);
    setSaveStatus("idle");

    const sources = referralInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const config: InquiryConfig = {
      welcome_message: welcomeMessage.trim() || null,
      confirmation_message: confirmationMessage.trim() || null,
      field_toggles: toggles,
      custom_fields: customFields.filter((cf) => cf.label.trim()),
      referral_sources: sources.length ? sources : initialConfig.referral_sources,
    };

    startTransition(async () => {
      const result = await updateInquiryConfig(config);
      if (result.error) {
        setErrorMsg(result.error.message);
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        router.refresh();
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
  }

  const inputCls =
    "mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Messages */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Messages</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Welcome Message{" "}
              <span className="text-xs text-muted-foreground/50">(shown above the form)</span>
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="e.g. Thank you for your interest in our school. Please fill in the form below and we'll be in touch."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Confirmation Message{" "}
              <span className="text-xs text-muted-foreground/50">(shown on success screen)</span>
            </label>
            <textarea
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
              rows={3}
              placeholder="e.g. We've received your enquiry and will be in touch within 2 business days."
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Field toggles */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-foreground">Optional Fields</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Toggle which built-in fields appear on the enquiry form. Required fields (parent name, email, child name/DOB) always appear.
        </p>
        <div className="space-y-3">
          {(
            [
              { key: "phone", label: "Parent phone number" },
              { key: "current_school", label: "Child's current school" },
              { key: "siblings", label: "Siblings currently enrolled" },
              { key: "how_heard", label: "How did you hear about us?" },
              { key: "notes", label: "Questions / notes field" },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-3">
              <div
                onClick={() => toggle(key)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  toggles[key] ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${
                    toggles[key] ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Referral sources */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-foreground">
          &ldquo;How did you hear about us?&rdquo; Options
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          One option per line. Only shown when the field above is enabled.
        </p>
        <textarea
          value={referralInput}
          onChange={(e) => setReferralInput(e.target.value)}
          onBlur={handleReferralBlur}
          rows={8}
          className={inputCls + " font-mono text-xs"}
          placeholder={"Friend or family\nGoogle search\nSocial media\nSchool website\nOpen day / tour\nOther"}
        />
      </div>

      {/* Custom questions */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Custom Questions</h3>
            <p className="text-sm text-muted-foreground">
              Added after the standard form sections.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomField}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            + Add Question
          </button>
        </div>

        {customFields.length === 0 && (
          <p className="text-sm italic text-muted-foreground/50">No custom questions yet.</p>
        )}

        <div className="space-y-3">
          {customFields.map((cf, index) => (
            <div
              key={cf.id}
              className="grid grid-cols-12 items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 animate-slide-down"
            >
              <div className="col-span-5">
                <input
                  type="text"
                  value={cf.label}
                  onChange={(e) => updateCustomField(index, { label: e.target.value })}
                  placeholder="Question label"
                  className="block w-full rounded border border-input bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              <div className="col-span-3">
                <select
                  value={cf.type}
                  onChange={(e) =>
                    updateCustomField(index, { type: e.target.value as CustomField["type"] })
                  }
                  className="block w-full rounded border border-input bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="select">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Date</option>
                </select>
              </div>
              {cf.type === "select" && (
                <div className="col-span-12 -mt-1">
                  <input
                    type="text"
                    value={cf.options?.join(", ") ?? ""}
                    onChange={(e) =>
                      updateCustomField(index, {
                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Option 1, Option 2, Option 3"
                    className="block w-full rounded border border-input bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              )}
              <div className="col-span-2 flex items-center py-1.5">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!cf.required}
                    onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-primary"
                  />
                  Required
                </label>
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saveStatus === "saved" && (
          <span className="text-sm font-medium text-success">Saved</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-primary transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Enquiry Config"}
        </button>
      </div>
    </div>
  );
}
