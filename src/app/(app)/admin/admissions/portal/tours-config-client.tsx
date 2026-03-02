"use client";

// src/app/(app)/admin/admissions/portal/tours-config-client.tsx
//
// ============================================================
// WattleOS V2 - Tours Page Config Admin UI
// ============================================================
// Allows admins to configure the public /tours page:
//   - Welcome/intro text shown below the page heading
//   - Custom questions appended to the booking form
// ============================================================

import { updateToursConfig } from "@/lib/actions/admissions/tours-config";
import type { CustomField, ToursConfig } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ToursConfigClientProps {
  initialConfig: ToursConfig;
}

function newFieldId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cq_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToursConfigClient({ initialConfig }: ToursConfigClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState(initialConfig.welcome_message ?? "");
  const [customQuestions, setCustomQuestions] = useState<CustomField[]>(initialConfig.custom_questions);

  function addQuestion() {
    setCustomQuestions((prev) => [
      ...prev,
      { id: newFieldId(), label: "", type: "text", required: false },
    ]);
  }

  function updateQuestion(index: number, patch: Partial<CustomField>) {
    setCustomQuestions((prev) =>
      prev.map((q, i) => (i === index ? ({ ...q, ...patch } as CustomField) : q)),
    );
  }

  function removeQuestion(index: number) {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setErrorMsg(null);
    setSaveStatus("idle");

    const config: ToursConfig = {
      welcome_message: welcomeMessage.trim() || null,
      custom_questions: customQuestions.filter((q) => q.label.trim()),
    };

    startTransition(async () => {
      const result = await updateToursConfig(config);
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

      {/* Welcome message */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-foreground">Page Intro</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Shown below the &ldquo;Book a Tour&rdquo; heading on the public tours page.
        </p>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={3}
          placeholder="e.g. We'd love to show you around. Book a time below and one of our guides will take you on a personalised tour of our community."
          className={inputCls}
        />
      </div>

      {/* Custom booking questions */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Custom Booking Questions</h3>
            <p className="text-sm text-muted-foreground">
              Added to every tour booking form below the standard fields.
            </p>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            + Add Question
          </button>
        </div>

        {customQuestions.length === 0 && (
          <p className="text-sm italic text-muted-foreground/50">No custom questions yet.</p>
        )}

        <div className="space-y-3">
          {customQuestions.map((q, index) => (
            <div
              key={q.id}
              className="grid grid-cols-12 items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 animate-slide-down"
            >
              <div className="col-span-5">
                <input
                  type="text"
                  value={q.label}
                  onChange={(e) => updateQuestion(index, { label: e.target.value })}
                  placeholder="Question label"
                  className="block w-full rounded border border-input bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              <div className="col-span-3">
                <select
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(index, { type: e.target.value as CustomField["type"] })
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
              {q.type === "select" && (
                <div className="col-span-12 -mt-1">
                  <input
                    type="text"
                    value={q.options?.join(", ") ?? ""}
                    onChange={(e) =>
                      updateQuestion(index, {
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
                    checked={!!q.required}
                    onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-primary"
                  />
                  Required
                </label>
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
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
          {isPending ? "Saving…" : "Save Tours Config"}
        </button>
      </div>
    </div>
  );
}
