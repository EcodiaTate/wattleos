"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import type { QipEvidenceType } from "@/types/domain";
import {
  searchEvidenceSources,
  attachEvidence,
  type EvidenceSearchResult,
} from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface EvidenceLinkerProps {
  nqsElementId?: string;
  qipGoalId?: string;
  suggestedType?: QipEvidenceType;
  onAttached: () => void;
  onCancel: () => void;
}

const SEARCHABLE_TYPES: Array<{ value: QipEvidenceType; label: string }> = [
  { value: "observation", label: "Observation" },
  { value: "incident", label: "Incident" },
  { value: "policy", label: "Policy" },
];

export function EvidenceLinker({
  nqsElementId,
  qipGoalId,
  suggestedType,
  onAttached,
  onCancel,
}: EvidenceLinkerProps) {
  const [selectedType, setSelectedType] = useState<QipEvidenceType>(
    suggestedType ?? "observation",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EvidenceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const haptics = useHaptics();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isManualType = ["photo", "document", "other"].includes(selectedType);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        const result = await searchEvidenceSources({
          query: searchQuery.trim(),
          type: selectedType,
        });
        if (result.data) setResults(result.data);
        setIsSearching(false);
      }, 300);
    },
    [selectedType],
  );

  function handleSelectResult(result: EvidenceSearchResult) {
    haptics.impact("medium");
    startTransition(async () => {
      setError(null);
      const res = await attachEvidence({
        nqs_element_id: nqsElementId ?? null,
        qip_goal_id: qipGoalId ?? null,
        evidence_type: result.type,
        evidence_id: result.id,
        title: result.title,
        notes: null,
      });
      if (res.error) {
        haptics.error();
        setError(res.error.message);
      } else {
        haptics.success();
        onAttached();
      }
    });
  }

  function handleManualAttach(e: React.FormEvent) {
    e.preventDefault();
    haptics.impact("medium");
    startTransition(async () => {
      setError(null);
      const res = await attachEvidence({
        nqs_element_id: nqsElementId ?? null,
        qip_goal_id: qipGoalId ?? null,
        evidence_type: selectedType,
        evidence_id: null,
        title: manualTitle,
        notes: manualNotes || null,
      });
      if (res.error) {
        haptics.error();
        setError(res.error.message);
      } else {
        haptics.success();
        onAttached();
      }
    });
  }

  return (
    <div
      className="space-y-4 rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <h3
        className="text-sm font-bold"
        style={{ color: "var(--foreground)" }}
      >
        Link Evidence
      </h3>

      {/* Type selector */}
      <div className="flex flex-wrap gap-1">
        {[...SEARCHABLE_TYPES, { value: "document" as const, label: "Document" }, { value: "other" as const, label: "Other" }].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              haptics.selection();
              setSelectedType(t.value);
              setResults([]);
              setQuery("");
            }}
            className="active-push rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor:
                selectedType === t.value
                  ? "var(--primary)"
                  : "var(--muted)",
              color:
                selectedType === t.value
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search mode for observation/incident/policy */}
      {!isManualType && (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search ${selectedType}s...`}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />

          {isSearching && (
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Searching...
            </p>
          )}

          {results.length > 0 && (
            <div className="max-h-60 space-y-2 overflow-y-auto scroll-native">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelectResult(r)}
                  className="active-push w-full rounded-lg border border-border p-3 text-left"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {r.title}
                  </p>
                  {r.preview && (
                    <p
                      className="mt-0.5 line-clamp-2 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {r.preview}
                    </p>
                  )}
                  <p
                    className="mt-1 text-[10px]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {new Date(r.date).toLocaleDateString("en-AU")}
                  </p>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !isSearching && results.length === 0 && (
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              No {selectedType}s found matching "{query}"
            </p>
          )}
        </>
      )}

      {/* Manual entry for document/other */}
      {isManualType && (
        <form onSubmit={handleManualAttach} className="space-y-3">
          <div>
            <label
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              Title
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              required
              placeholder="Describe the evidence..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              Notes
            </label>
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              rows={2}
              placeholder="Additional context..."
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Attaching..." : "Attach Evidence"}
          </button>
        </form>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="active-push rounded-lg px-3 py-1.5 text-xs font-medium"
        style={{
          backgroundColor: "var(--muted)",
          color: "var(--foreground)",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
