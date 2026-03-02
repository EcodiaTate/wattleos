"use client";

// src/components/domain/accreditation/accreditation-checklist-client.tsx
//
// The core self-assessment UI. Shows domain groups with criterion
// cards. Inline rating selector + narrative fields. Evidence panel.

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { upsertAccreditationAssessment, createAccreditationEvidence } from "@/lib/actions/accreditation";
import type {
  AccreditationRating,
  AccreditationCycleWithProgress,
  AccreditationDomainProgress,
  AccreditationEvidenceType,
} from "@/types/domain";
import {
  AccreditationRatingBadge,
  AccreditationProgressBar,
  AccreditationBodyChip,
  AccreditationCycleStatusBadge,
} from "./accreditation-rating-badge";

const RATING_OPTIONS: { value: AccreditationRating; label: string; emoji: string }[] = [
  { value: "not_started",   label: "Not Started",   emoji: "⬜" },
  { value: "not_met",       label: "Not Met",       emoji: "🔴" },
  { value: "partially_met", label: "Partially Met", emoji: "🟡" },
  { value: "met",           label: "Met",           emoji: "🟢" },
  { value: "exceeds",       label: "Exceeds",       emoji: "⭐" },
];

const EVIDENCE_TYPES: { value: AccreditationEvidenceType; label: string }[] = [
  { value: "note",       label: "Note" },
  { value: "link",       label: "External Link" },
  { value: "document",   label: "Document / File" },
  { value: "photo",      label: "Photo" },
  { value: "observation",label: "Observation" },
];

interface Props {
  cycle: AccreditationCycleWithProgress;
  domains: AccreditationDomainProgress[];
  canManage: boolean;
}

export function AccreditationChecklistClient({ cycle, domains: initialDomains, canManage }: Props) {
  const haptics = useHaptics();
  const [domains, setDomains] = useState(initialDomains);
  const [activeCriterionId, setActiveCriterionId] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set(initialDomains.map(d => d.domain_name)),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();

  function toggleDomain(domainName: string) {
    haptics.impact("light");
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainName)) next.delete(domainName);
      else next.add(domainName);
      return next;
    });
  }

  async function handleRatingChange(
    cycleId: string,
    criterionId: string,
    existingAssessmentId: string | undefined,
    rating: AccreditationRating,
  ) {
    if (!canManage) return;
    haptics.impact("medium");
    setSavingId(criterionId);

    const result = await upsertAccreditationAssessment({
      cycle_id: cycleId,
      criterion_id: criterionId,
      rating,
    });

    setSavingId(null);
    if (result.error) {
      haptics.error();
      return;
    }
    haptics.success();

    // Optimistic update
    setDomains(prev =>
      prev.map(domain => ({
        ...domain,
        criteria: domain.criteria.map(c => {
          if (c.criterion.id !== criterionId) return c;
          return {
            ...c,
            assessment: result.data ?? {
              id: existingAssessmentId ?? "",
              tenant_id: "",
              cycle_id: cycleId,
              criterion_id: criterionId,
              rating,
              self_assessment: null,
              strengths: null,
              areas_for_growth: null,
              action_required: null,
              target_date: null,
              assessed_by: null,
              assessed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };
        }),
        met_count: domain.criteria.filter(c => {
          if (c.criterion.id !== criterionId) {
            return c.assessment && (c.assessment.rating === "met" || c.assessment.rating === "exceeds");
          }
          return rating === "met" || rating === "exceeds";
        }).length,
      })),
    );
  }

  const totalCriteria = domains.reduce((sum, d) => sum + d.total_count, 0);
  const metCount = domains.reduce((sum, d) => sum + d.met_count, 0);
  const pct = totalCriteria > 0 ? Math.round((metCount / totalCriteria) * 100) : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <AccreditationBodyChip bodyCode={cycle.body_code} />
            <AccreditationCycleStatusBadge status={cycle.status} size="sm" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            {cycle.cycle_label}
          </h1>
        </div>
        <div className="w-full sm:w-72">
          <AccreditationProgressBar pct={pct} metCount={metCount} totalCount={totalCriteria} />
        </div>
      </div>

      {/* Domain sections */}
      {domains.map(domain => (
        <div
          key={domain.domain_name}
          className="border border-border rounded-xl overflow-hidden"
          style={{ background: "var(--card)" }}
        >
          {/* Domain header */}
          <button
            type="button"
            onClick={() => toggleDomain(domain.domain_name)}
            className="w-full flex items-center justify-between px-5 py-4 text-left touch-target"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-base" style={{ color: "var(--foreground)" }}>
                {domain.domain_name}
              </span>
              <span className="text-sm px-2 py-0.5 rounded-full" style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}>
                {domain.met_count}/{domain.total_count}
              </span>
            </div>
            <span style={{ color: "var(--muted-foreground)" }}>
              {expandedDomains.has(domain.domain_name) ? "▲" : "▼"}
            </span>
          </button>

          {/* Criteria */}
          {expandedDomains.has(domain.domain_name) && (
            <div className="divide-y divide-border border-t border-border">
              {domain.criteria.map(({ criterion, assessment, evidence_count }) => {
                const isActive = activeCriterionId === criterion.id;
                const isSaving = savingId === criterion.id;
                return (
                  <div key={criterion.id} className="px-5 py-4 space-y-3">
                    {/* Criterion header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}
                          >
                            {criterion.criterion_code}
                          </span>
                          {evidence_count > 0 && (
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                              📎 {evidence_count} evidence item{evidence_count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {criterion.criterion_title}
                        </p>
                        {criterion.description && (
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {criterion.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSaving ? (
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Saving…</span>
                        ) : assessment ? (
                          <AccreditationRatingBadge rating={assessment.rating} size="sm" />
                        ) : (
                          <AccreditationRatingBadge rating="not_started" size="sm" />
                        )}
                      </div>
                    </div>

                    {/* Rating selector (inline for quick rating) */}
                    {canManage && (
                      <div className="flex flex-wrap gap-1.5">
                        {RATING_OPTIONS.map(opt => {
                          const isCurrent = (assessment?.rating ?? "not_started") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                handleRatingChange(cycle.id, criterion.id, assessment?.id, opt.value)
                              }
                              disabled={isSaving}
                              className="touch-target active-push flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                              style={{
                                background: isCurrent ? "var(--primary)" : "var(--muted)",
                                color: isCurrent ? "var(--primary-foreground)" : "var(--muted-foreground)",
                                borderColor: isCurrent ? "var(--primary)" : "var(--border)",
                              }}
                            >
                              {opt.emoji} {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Guidance + expand */}
                    {criterion.guidance && (
                      <details className="text-xs group">
                        <summary
                          className="cursor-pointer list-none font-medium"
                          style={{ color: "var(--primary)" }}
                        >
                          View evidence guidance ↓
                        </summary>
                        <p
                          className="mt-2 p-3 rounded-lg"
                          style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}
                        >
                          {criterion.guidance}
                        </p>
                      </details>
                    )}

                    {/* Quick evidence note (shown when active) */}
                    {canManage && assessment && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            haptics.impact("light");
                            setActiveCriterionId(isActive ? null : criterion.id);
                          }}
                          className="touch-target active-push text-xs font-medium"
                          style={{ color: "var(--primary)" }}
                        >
                          {isActive ? "Hide" : "+ Add evidence"}
                        </button>
                      </div>
                    )}

                    {/* Evidence adder (expanded) */}
                    {isActive && assessment && (
                      <EvidenceAdder
                        assessmentId={assessment.id}
                        onAdded={() => {
                          haptics.success();
                          setActiveCriterionId(null);
                          // Increment evidence count optimistically
                          setDomains(prev =>
                            prev.map(d => ({
                              ...d,
                              criteria: d.criteria.map(c =>
                                c.criterion.id === criterion.id
                                  ? { ...c, evidence_count: c.evidence_count + 1 }
                                  : c,
                              ),
                            })),
                          );
                        }}
                        onCancel={() => setActiveCriterionId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Evidence adder inline form ───────────────────────────────

function EvidenceAdder({
  assessmentId,
  onAdded,
  onCancel,
}: {
  assessmentId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const haptics = useHaptics();
  const [type, setType] = useState<AccreditationEvidenceType>("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setError(null);
    haptics.impact("medium");

    startTransition(async () => {
      const result = await createAccreditationEvidence({
        assessment_id: assessmentId,
        evidence_type: type,
        title,
        description: description || null,
        external_url: url && (type === "link" || type === "document") ? url : null,
        file_url: null,
        observation_id: null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      onAdded();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-border rounded-lg p-4 space-y-3"
      style={{ background: "var(--muted/30)" }}
    >
      <div className="flex items-center gap-3">
        <select
          value={type}
          onChange={e => setType(e.target.value as AccreditationEvidenceType)}
          className="border border-border rounded px-2 py-1 text-xs"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          {EVIDENCE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
          Add Evidence
        </span>
      </div>
      <input
        type="text"
        required
        placeholder="Title / description of evidence"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border border-border rounded px-2.5 py-1.5 text-xs"
        style={{ background: "var(--input)", color: "var(--foreground)" }}
      />
      {(type === "link" || type === "document") && (
        <input
          type="url"
          placeholder="https://…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full border border-border rounded px-2.5 py-1.5 text-xs"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      )}
      {type === "note" && (
        <textarea
          rows={2}
          placeholder="Evidence details…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-border rounded px-2.5 py-1.5 text-xs resize-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      )}
      {error && <p className="text-xs" style={{ color: "var(--destructive)" }}>{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !title}
          className="touch-target active-push px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="touch-target active-push px-3 py-1.5 rounded text-xs font-medium border border-border"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
