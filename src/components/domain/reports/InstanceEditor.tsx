"use client";

// src/components/domain/reports/InstanceEditor.tsx
//
// ============================================================
// WattleOS V2 - Report Instance Editor (Client Component)
// ============================================================
// Guide-facing report editor with:
//   - Section-by-section editing (narrative, goals, custom_text)
//   - Autosave on blur (debounced 1.5 s)
//   - Word count display with suggested minimum warning
//   - Paid section lock overlay with UpsellNudge
//   - Submit button when all required sections have content
//   - Read-only rendering for auto-populated sections
// ============================================================

import { UpsellNudge } from "@/components/plg/UpsellNudge";
import { UpgradeModal } from "@/components/plg/UpgradeModal";
import {
  saveInstanceDraft,
  submitInstance,
} from "@/lib/actions/reports/instances";
import type {
  ReportInstanceSectionResponse,
  ReportInstanceWithContext,
} from "@/types/domain";
import type { TemplateSection } from "@/lib/reports/types";
import type { PlanTier } from "@/types/domain";
import { useCallback, useRef, useState, useTransition } from "react";

// ── Types ─────────────────────────────────────────────────

interface SectionWithGating extends TemplateSection {
  isPaidLocked: boolean;
}

interface InstanceEditorProps {
  instance: ReportInstanceWithContext;
  sections: SectionWithGating[];
  isEditable: boolean;
  planTier: PlanTier;
}

// ── Status badge colours ──────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> =
  {
    not_started: {
      label: "Not Started",
      bg: "var(--color-muted)",
      fg: "var(--color-muted-fg)",
    },
    in_progress: {
      label: "In Progress",
      bg: "var(--color-info-subtle)",
      fg: "var(--color-info-fg)",
    },
    submitted: {
      label: "Submitted",
      bg: "var(--color-success-subtle)",
      fg: "var(--color-success-fg)",
    },
    changes_requested: {
      label: "Changes Requested",
      bg: "var(--color-warning-subtle)",
      fg: "var(--color-warning-fg)",
    },
    approved: {
      label: "Approved",
      bg: "var(--color-success-subtle)",
      fg: "var(--color-success-fg)",
    },
    published: {
      label: "Published",
      bg: "var(--color-success-subtle)",
      fg: "var(--color-success-fg)",
    },
  };

// ── Section type labels (for auto-populated sections) ─────

const SECTION_TYPE_LABELS: Record<string, string> = {
  student_info: "Student Information",
  mastery_grid: "Mastery Grid",
  mastery_summary: "Mastery Summary",
  attendance_summary: "Attendance Summary",
  observation_highlights: "Observation Highlights",
};

const EDITABLE_SECTION_TYPES = new Set(["narrative", "custom_text", "goals"]);

// ── Word count ────────────────────────────────────────────

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ── Section Editor ────────────────────────────────────────

function SectionTextEditor({
  section,
  initialContent,
  onSave,
  disabled,
}: {
  section: SectionWithGating;
  initialContent: string;
  onSave: (sectionId: string, content: string, sectionType: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(initialContent);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordCount = countWords(value);
  const suggested = section.config?.suggestedMinWords ?? 0;
  const isBelowSuggested =
    suggested > 0 && wordCount < suggested && wordCount > 0;

  const triggerSave = useCallback(
    (text: string) => {
      setSaveState("saving");
      onSave(section.id, text, section.type);
      // Optimistic: mark saved after a brief delay
      setTimeout(() => setSaveState("saved"), 800);
      setTimeout(() => setSaveState("idle"), 3000);
    },
    [section.id, section.type, onSave],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => triggerSave(text), 1500);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    triggerSave(value);
  };

  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-y"
        style={{ minHeight: 120, lineHeight: "1.6" }}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={
          section.config?.placeholder ??
          `Write ${section.title.toLowerCase()}...`
        }
        disabled={disabled}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {wordCount} word{wordCount !== 1 ? "s" : ""}
          {isBelowSuggested && (
            <span style={{ color: "var(--color-warning-fg)" }}>
              {" "}
              (suggested minimum: {suggested})
            </span>
          )}
        </span>
        {saveState === "saving" && <span>Saving…</span>}
        {saveState === "saved" && (
          <span style={{ color: "var(--color-success-fg)" }}>Saved</span>
        )}
        {saveState === "error" && (
          <span style={{ color: "var(--color-destructive)" }}>Save failed</span>
        )}
      </div>
    </div>
  );
}

// ── Auto-populated section placeholder ───────────────────

function AutoSectionPlaceholder({ sectionType }: { sectionType: string }) {
  return (
    <div
      className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
      style={{ borderColor: "var(--color-border)" }}
    >
      {SECTION_TYPE_LABELS[sectionType] ?? sectionType} - auto-populated at
      report generation
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function InstanceEditor({
  instance,
  sections,
  isEditable,
  planTier,
}: InstanceEditorProps) {
  const [responses, setResponses] = useState<ReportInstanceSectionResponse[]>(
    instance.section_responses,
  );
  const [status, setStatus] = useState(instance.status);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.not_started;
  const isFree = planTier === "free";

  // ── Autosave handler ─────────────────────────────────

  const handleSave = useCallback(
    (sectionId: string, content: string, sectionType: string) => {
      startTransition(async () => {
        const result = await saveInstanceDraft(instance.id, {
          section_id: sectionId,
          content,
          section_type: sectionType,
        });
        if (result.data) {
          setResponses(result.data.section_responses);
          setStatus(result.data.status);
        }
      });
    },
    [instance.id],
  );

  // ── Submit ────────────────────────────────────────────

  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitInstance(instance.id);
      if (result.error) {
        setSubmitError(result.error);
      } else if (result.data) {
        setStatus(result.data.status);
      }
    });
  };

  // ── Required sections complete check ─────────────────
  // A section is "required" if it's editable; it's complete
  // if it has any content saved.

  const editableSections = sections.filter(
    (s) => EDITABLE_SECTION_TYPES.has(s.type) && !s.isPaidLocked,
  );
  const completedCount = editableSections.filter((s) => {
    const resp = responses.find((r) => r.section_id === s.id);
    return resp && resp.word_count > 0;
  }).length;
  const allComplete =
    editableSections.length === 0 || completedCount === editableSections.length;
  const canSubmit =
    isEditable &&
    allComplete &&
    !["submitted", "approved", "published"].includes(status);

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: statusStyle.bg, color: statusStyle.fg }}
        >
          {statusStyle.label}
        </div>
        {isEditable && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{editableSections.length} section
            {editableSections.length !== 1 ? "s" : ""} complete
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isEditableType = EDITABLE_SECTION_TYPES.has(section.type);
          const response = responses.find((r) => r.section_id === section.id);
          const initialContent = response?.content ?? "";

          return (
            <div
              key={section.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {section.title}
                {section.isPaidLocked && (
                  <span
                    className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      background: "var(--color-warning-subtle)",
                      color: "var(--color-warning-fg)",
                    }}
                  >
                    Pro
                  </span>
                )}
              </h3>

              {section.isPaidLocked ? (
                <UpsellNudge
                  feature="report_mastery_summary_section"
                  variant="overlay"
                  onCtaClick={() => setShowUpgradeModal(true)}
                >
                  <div
                    className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    {section.title}
                  </div>
                </UpsellNudge>
              ) : isEditableType ? (
                <SectionTextEditor
                  section={section}
                  initialContent={initialContent}
                  onSave={handleSave}
                  disabled={!isEditable || isPending}
                />
              ) : (
                <AutoSectionPlaceholder sectionType={section.type} />
              )}
            </div>
          );
        })}
      </div>

      {/* Submit CTA */}
      {isEditable && (
        <div className="rounded-xl border border-border bg-card p-5">
          {submitError && (
            <p
              className="mb-3 text-sm"
              style={{ color: "var(--color-destructive)" }}
            >
              {submitError}
            </p>
          )}

          {/* Pro upsell: after editing, nudge about automation */}
          {isFree && responses.length > 0 && (
            <div className="mb-4">
              <UpsellNudge
                feature="report_observation_highlights"
                variant="inline"
                contextMessage="With curriculum tracking connected, WattleOS can auto-fill mastery and observation sections."
                onCtaClick={() => setShowUpgradeModal(true)}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {allComplete
                ? "All sections complete. Ready to submit for review."
                : `Complete ${editableSections.length - completedCount} more section${editableSections.length - completedCount !== 1 ? "s" : ""} to submit.`}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className="touch-target rounded-lg px-5 py-2 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-fg)",
              }}
            >
              {isPending ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
