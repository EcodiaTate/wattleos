"use client";

// ============================================================
// WattleOS V2 - ID Cards Client (Module R)
// ============================================================
// Manages template creation, editing, and batch card generation.
// ============================================================

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { IdCardTemplateForm } from "@/components/domain/school-photos/id-card-template-form";
import { IdCardBatchClient } from "@/components/domain/school-photos/id-card-batch-client";
import { saveIdCardTemplate } from "@/lib/actions/school-photos";
import type { IdCardTemplate, IdCardPersonData } from "@/types/domain";
import type { SaveIdCardTemplateInput } from "@/lib/validations/school-photos";

interface IdCardsClientProps {
  templates: IdCardTemplate[];
  schoolName: string;
  schoolLogoUrl: string | null;
}

type Tab = "templates" | "generate";

export function IdCardsClient({
  templates: initialTemplates,
  schoolName,
  schoolLogoUrl,
}: IdCardsClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<IdCardTemplate | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);

  const samplePerson: IdCardPersonData = {
    id: "00000000-0000-0000-0000-000000000000",
    first_name: "Jamie",
    last_name: "Smith",
    preferred_name: null,
    photo_url: null,
    class_name: "Bottlebrush Room",
    position: "Lead Educator",
    person_type: "student",
  };

  const handleSaveTemplate = useCallback(
    async (input: SaveIdCardTemplateInput) => {
      haptics.impact("medium");
      const result = await saveIdCardTemplate(input);
      if (result.data) {
        router.refresh();
        setShowForm(false);
        setEditingTemplate(null);
      }
    },
    [haptics, router],
  );

  return (
    <div className="space-y-6">
      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => {
            setTab("templates");
            haptics.impact("light");
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium active-push touch-target"
          style={{
            backgroundColor:
              tab === "templates" ? "var(--primary)" : "transparent",
            color:
              tab === "templates"
                ? "var(--primary-foreground)"
                : "var(--muted-foreground)",
          }}
        >
          Templates
        </button>
        <button
          onClick={() => {
            setTab("generate");
            haptics.impact("light");
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium active-push touch-target"
          style={{
            backgroundColor:
              tab === "generate" ? "var(--primary)" : "transparent",
            color:
              tab === "generate"
                ? "var(--primary-foreground)"
                : "var(--muted-foreground)",
          }}
        >
          Generate Cards
        </button>
      </div>

      {tab === "templates" ? (
        <div className="space-y-6">
          {showForm ? (
            <IdCardTemplateForm
              template={editingTemplate ?? undefined}
              onSave={handleSaveTemplate}
              samplePerson={samplePerson}
              schoolName={schoolName}
              schoolLogoUrl={schoolLogoUrl}
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  Card Templates
                </h2>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowForm(true);
                    haptics.impact("light");
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium active-push touch-target"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  New Template
                </button>
              </div>

              {templates.length === 0 ? (
                <div
                  className="rounded-lg border border-border p-12 text-center"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  <div
                    className="text-4xl mb-3"
                    style={{ color: "var(--empty-state-icon)" }}
                  >
                    🪪
                  </div>
                  <p style={{ color: "var(--muted-foreground)" }}>
                    No templates yet. Create one to start generating ID cards.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setShowForm(true);
                        haptics.impact("light");
                      }}
                      className="card-interactive rounded-lg border border-border p-4 text-left"
                      style={{ backgroundColor: "var(--card)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-medium"
                          style={{ color: "var(--foreground)" }}
                        >
                          {tpl.name}
                        </span>
                        {tpl.is_default ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: "var(--photo-matched-bg)",
                              color: "var(--photo-matched)",
                            }}
                          >
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {tpl.person_type === "student" ? "Student" : "Staff"} ·{" "}
                        {tpl.template_config.card_orientation}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <IdCardBatchClient templates={templates} classes={[]} />
      )}
    </div>
  );
}
