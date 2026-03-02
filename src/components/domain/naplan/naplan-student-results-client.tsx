"use client";

// src/components/domain/naplan/naplan-student-results-client.tsx
//
// Per-student results entry - all 5 domains on one form.
// Supports both initial entry and updating existing results.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { NaplanProficiencyBadge } from "./naplan-proficiency-badge";
import { batchRecordResults } from "@/lib/actions/naplan";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  NAPLAN_DOMAIN_CONFIG,
  NAPLAN_DOMAINS,
  NAPLAN_PROFICIENCY_CONFIG,
  NAPLAN_PROFICIENCY_LEVELS,
} from "@/lib/constants/naplan";
import type {
  NaplanDomain,
  NaplanProficiencyLevel,
  NaplanStudentRecord,
  NaplanWindowStatus,
} from "@/types/domain";

interface NaplanStudentResultsClientProps {
  record: NaplanStudentRecord;
  windowId: string;
  windowStatus: NaplanWindowStatus;
  canManage: boolean;
}

type DomainEntry = {
  proficiency_level: NaplanProficiencyLevel | "";
  scaled_score: string;
  national_average_score: string;
  state_average_score: string;
  above_national_minimum: boolean;
  notes: string;
};

function emptyEntry(): DomainEntry {
  return {
    proficiency_level: "",
    scaled_score: "",
    national_average_score: "",
    state_average_score: "",
    above_national_minimum: true,
    notes: "",
  };
}

export function NaplanStudentResultsClient({
  record,
  windowId,
  windowStatus,
  canManage,
}: NaplanStudentResultsClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialise form state from existing results
  const [domains, setDomains] = useState<Record<NaplanDomain, DomainEntry>>(
    () => {
      const init = {} as Record<NaplanDomain, DomainEntry>;
      for (const d of NAPLAN_DOMAINS) {
        const existing = record.results_by_domain[d];
        if (existing) {
          init[d] = {
            proficiency_level: existing.proficiency_level,
            scaled_score: existing.scaled_score?.toString() ?? "",
            national_average_score:
              existing.national_average_score?.toString() ?? "",
            state_average_score: existing.state_average_score?.toString() ?? "",
            above_national_minimum: existing.above_national_minimum,
            notes: existing.notes ?? "",
          };
        } else {
          init[d] = emptyEntry();
        }
      }
      return init;
    },
  );

  function updateDomain(
    domain: NaplanDomain,
    field: keyof DomainEntry,
    value: string | boolean,
  ) {
    setDomains((prev) => ({
      ...prev,
      [domain]: { ...prev[domain], [field]: value },
    }));
    setSaved(false);
  }

  // Auto-set above_national_minimum based on proficiency level
  function handleProficiencyChange(
    domain: NaplanDomain,
    level: NaplanProficiencyLevel,
  ) {
    const meetsNms = NAPLAN_PROFICIENCY_CONFIG[level].meetsNms;
    setDomains((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        proficiency_level: level,
        above_national_minimum: meetsNms,
      },
    }));
    haptics.selection();
    setSaved(false);
  }

  const isReadOnly = windowStatus === "closed" || !canManage;

  function handleSave() {
    setError(null);
    setSaved(false);

    // Collect only domains that have a proficiency level set
    const results = NAPLAN_DOMAINS.filter(
      (d) => domains[d].proficiency_level !== "",
    ).map((d) => {
      const entry = domains[d];
      return {
        domain: d,
        proficiency_level: entry.proficiency_level as NaplanProficiencyLevel,
        scaled_score: entry.scaled_score
          ? parseInt(entry.scaled_score, 10)
          : null,
        national_average_score: entry.national_average_score
          ? parseInt(entry.national_average_score, 10)
          : null,
        state_average_score: entry.state_average_score
          ? parseInt(entry.state_average_score, 10)
          : null,
        above_national_minimum: entry.above_national_minimum,
        notes: entry.notes || null,
      };
    });

    if (results.length === 0) {
      setError("Enter at least one domain result before saving.");
      return;
    }

    startTransition(async () => {
      const result = await batchRecordResults({
        cohort_entry_id: record.cohort_entry.id,
        results,
      });

      if (!result.error) {
        haptics.success();
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error.message);
        haptics.error();
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "var(--destructive-bg, hsl(0 60% 96%))",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {saved && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--naplan-strong-bg)",
            color: "var(--naplan-strong)",
          }}
        >
          Results saved successfully.
        </div>
      )}

      {/* Domain result cards */}
      <div className="space-y-4">
        {NAPLAN_DOMAINS.map((domain) => {
          const entry = domains[domain];
          const cfg = NAPLAN_DOMAIN_CONFIG[domain];

          return (
            <div
              key={domain}
              className="rounded-xl border border-border p-5"
              style={{ background: "var(--card)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{cfg.label}</h3>
                {entry.proficiency_level && (
                  <NaplanProficiencyBadge
                    level={entry.proficiency_level as NaplanProficiencyLevel}
                  />
                )}
              </div>

              {/* Proficiency selector */}
              <div className="mb-4">
                <p
                  className="mb-2 text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Proficiency Level
                </p>
                <div className="flex flex-wrap gap-2">
                  {NAPLAN_PROFICIENCY_LEVELS.map((level) => {
                    const pCfg = NAPLAN_PROFICIENCY_CONFIG[level];
                    const selected = entry.proficiency_level === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handleProficiencyChange(domain, level)}
                        className="touch-target active-push rounded-lg border px-3 py-2 text-sm font-medium transition-all disabled:cursor-default"
                        style={
                          selected
                            ? {
                                background: `var(--${pCfg.cssVar})`,
                                color: `var(--${pCfg.cssVar}-fg)`,
                                borderColor: `var(--${pCfg.cssVar})`,
                              }
                            : {
                                background: "var(--card)",
                                color: "var(--muted-foreground)",
                                borderColor: "var(--border)",
                              }
                        }
                        title={pCfg.description}
                      >
                        {pCfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scores & NMS */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Scaled Score (0–1000)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={entry.scaled_score}
                    onChange={(e) =>
                      updateDomain(domain, "scaled_score", e.target.value)
                    }
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                    style={{
                      background: "var(--input)",
                      color: "var(--foreground)",
                    }}
                    placeholder="e.g. 498"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    National Average
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={entry.national_average_score}
                    onChange={(e) =>
                      updateDomain(
                        domain,
                        "national_average_score",
                        e.target.value,
                      )
                    }
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                    style={{
                      background: "var(--input)",
                      color: "var(--foreground)",
                    }}
                    placeholder="e.g. 488"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    State Average
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={entry.state_average_score}
                    onChange={(e) =>
                      updateDomain(
                        domain,
                        "state_average_score",
                        e.target.value,
                      )
                    }
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                    style={{
                      background: "var(--input)",
                      color: "var(--foreground)",
                    }}
                    placeholder="e.g. 491"
                  />
                </div>
              </div>

              {/* Above NMS toggle */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`nms-${domain}`}
                  checked={entry.above_national_minimum}
                  onChange={(e) =>
                    updateDomain(
                      domain,
                      "above_national_minimum",
                      e.target.checked,
                    )
                  }
                  disabled={isReadOnly}
                  className="rounded"
                />
                <label
                  htmlFor={`nms-${domain}`}
                  className="text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Met National Minimum Standard (NMS)
                </label>
              </div>

              {/* Notes */}
              <div className="mt-3">
                <textarea
                  value={entry.notes}
                  onChange={(e) =>
                    updateDomain(domain, "notes", e.target.value)
                  }
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Domain notes (optional)"
                  className="w-full resize-none rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                  style={{
                    background: "var(--input)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/naplan/${windowId}/results`)}
            className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Back to Results
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="touch-target active-push rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-60"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving…" : "Save Results"}
          </button>
        </div>
      )}

      {isReadOnly && (
        <div className="flex justify-start pt-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/naplan/${windowId}/results`)}
            className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Back to Results
          </button>
        </div>
      )}
    </div>
  );
}
