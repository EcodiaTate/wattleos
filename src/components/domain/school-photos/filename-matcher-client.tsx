"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  matchAllFilenames,
  type MatchResult,
  type PersonRosterEntry,
} from "@/lib/utils/filename-matching";
import { confirmBulkMatch } from "@/lib/actions/school-photos";

// ============================================================
// Filename Matcher Client (Module R)
// ============================================================
// After bulk upload, shows a matching UI for unmatched photos.
// Auto-matches filenames to roster using filename-matching
// utility, then presents 3 tiers: high confidence, uncertain,
// and unmatched for user review before bulk confirmation.
// ============================================================

interface PhotoEntry {
  id: string;
  photo_url: string;
  original_filename: string;
}

interface RosterEntry {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
}

interface FilenameMatcherClientProps {
  sessionId: string;
  photos: PhotoEntry[];
  roster: RosterEntry[];
  personType: "student" | "staff";
  onMatchComplete: () => void;
}

interface MatchedPhoto {
  photoId: string;
  photoUrl: string;
  originalFilename: string;
  matchResult: MatchResult;
  assignedPersonId: string | null;
  assignedPersonName: string | null;
}

function PersonPicker({
  roster,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  roster: RosterEntry[];
  selectedId: string | null;
  onSelect: (personId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const lower = searchQuery.toLowerCase();
    return roster.filter(
      (p) =>
        p.first_name.toLowerCase().includes(lower) ||
        p.last_name.toLowerCase().includes(lower) ||
        (p.preferred_name && p.preferred_name.toLowerCase().includes(lower)),
    );
  }, [roster, searchQuery]);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search name..."
        className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-xs"
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      />
      {searchQuery.trim() && filteredRoster.length > 0 && (
        <div
          className="scroll-native absolute top-full z-10 mt-1 max-h-[160px] w-full overflow-y-auto rounded-[var(--radius-md)] border border-border shadow-lg"
          style={{ background: "var(--card)" }}
        >
          {filteredRoster.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person.id)}
              className="active-push flex w-full items-center px-3 py-2 text-left text-xs transition-colors"
              style={{
                background:
                  person.id === selectedId
                    ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                    : "transparent",
                color: "var(--foreground)",
              }}
            >
              {person.preferred_name || person.first_name} {person.last_name}
            </button>
          ))}
        </div>
      )}
      {searchQuery.trim() && filteredRoster.length === 0 && (
        <div
          className="absolute top-full z-10 mt-1 w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-xs"
          style={{
            background: "var(--card)",
            color: "var(--muted-foreground)",
          }}
        >
          No matches found
        </div>
      )}
    </div>
  );
}

function MatchRow({
  match,
  roster,
  onReassign,
}: {
  match: MatchedPhoto;
  roster: RosterEntry[];
  onReassign: (photoId: string, personId: string, personName: string) => void;
}) {
  const haptics = useHaptics();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelect = useCallback(
    (personId: string) => {
      const person = roster.find((p) => p.id === personId);
      if (person) {
        const displayName = `${person.preferred_name || person.first_name} ${person.last_name}`;
        onReassign(match.photoId, personId, displayName);
        setSearchQuery("");
        haptics.impact("medium");
      }
    },
    [roster, match.photoId, onReassign, haptics],
  );

  const confidenceColor =
    match.matchResult.confidence === "high"
      ? "var(--photo-matched)"
      : match.matchResult.confidence === "medium" ||
          match.matchResult.confidence === "low"
        ? "var(--photo-unmatched)"
        : "var(--photo-no-photo)";

  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2"
      style={{ background: "var(--background)" }}
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-border">
        <img
          src={match.photoUrl}
          alt={match.originalFilename}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Filename */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-xs font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {match.originalFilename}
        </p>
        {match.matchResult.match_reason && (
          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            {match.matchResult.match_reason}
          </p>
        )}
      </div>

      {/* Arrow */}
      <svg
        className="h-4 w-4 flex-shrink-0"
        style={{ color: "var(--muted-foreground)" }}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
        />
      </svg>

      {/* Matched person or picker */}
      <div className="w-[180px] flex-shrink-0">
        {match.assignedPersonId ? (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: confidenceColor }}
            />
            <span
              className="truncate text-xs font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {match.assignedPersonName}
            </span>
            <button
              type="button"
              onClick={() => {
                onReassign(match.photoId, "", "");
                haptics.impact("light");
              }}
              className="flex-shrink-0 text-xs"
              style={{ color: "var(--muted-foreground)" }}
              aria-label="Clear match"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <PersonPicker
            roster={roster}
            selectedId={null}
            onSelect={handleSelect}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </div>
    </div>
  );
}

export function FilenameMatcherClient({
  sessionId,
  photos,
  roster,
  personType,
  onMatchComplete,
}: FilenameMatcherClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<{
    matched: number;
    errors: string[];
  } | null>(null);

  // Build roster entries for the matching utility
  const rosterEntries: PersonRosterEntry[] = useMemo(
    () =>
      roster.map((r) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        preferred_name: r.preferred_name,
      })),
    [roster],
  );

  // Run auto-match on mount
  const initialMatches: MatchedPhoto[] = useMemo(() => {
    const filenames = photos.map((p) => p.original_filename);
    const matchResults = matchAllFilenames(filenames, rosterEntries);

    return photos.map((photo) => {
      const result = matchResults.get(photo.original_filename) ?? {
        confidence: "none" as const,
        person_id: null,
        person_name: null,
        match_reason: null,
      };

      return {
        photoId: photo.id,
        photoUrl: photo.photo_url,
        originalFilename: photo.original_filename,
        matchResult: result,
        assignedPersonId: result.person_id,
        assignedPersonName: result.person_name,
      };
    });
  }, [photos, rosterEntries]);

  const [matches, setMatches] = useState<MatchedPhoto[]>(initialMatches);

  const handleReassign = useCallback(
    (photoId: string, personId: string, personName: string) => {
      setMatches((prev) =>
        prev.map((m) =>
          m.photoId === photoId
            ? {
                ...m,
                assignedPersonId: personId || null,
                assignedPersonName: personName || null,
                matchResult: personId
                  ? {
                      ...m.matchResult,
                      confidence: "high" as const,
                      person_id: personId,
                      person_name: personName,
                      match_reason: "Manual assignment",
                    }
                  : {
                      confidence: "none" as const,
                      person_id: null,
                      person_name: null,
                      match_reason: null,
                    },
              }
            : m,
        ),
      );
    },
    [],
  );

  // Split into 3 groups
  const highConfidence = matches.filter(
    (m) => m.matchResult.confidence === "high" && m.assignedPersonId,
  );
  const uncertain = matches.filter(
    (m) =>
      (m.matchResult.confidence === "medium" || m.matchResult.confidence === "low") &&
      m.assignedPersonId,
  );
  const unmatched = matches.filter(
    (m) => m.matchResult.confidence === "none" || !m.assignedPersonId,
  );

  const matchedCount = matches.filter((m) => m.assignedPersonId).length;

  const handleConfirmAll = useCallback(() => {
    setError(null);

    const matchesToConfirm = matches
      .filter((m) => m.assignedPersonId)
      .map((m) => ({
        photo_id: m.photoId,
        person_id: m.assignedPersonId!,
        person_type: personType,
      }));

    if (matchesToConfirm.length === 0) {
      setError("No photos are matched. Assign people to photos before confirming.");
      return;
    }

    startTransition(async () => {
      const result = await confirmBulkMatch({
        session_id: sessionId,
        matches: matchesToConfirm,
        set_as_current: true,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      setConfirmationResult(result.data!);
      haptics.impact("heavy");
      onMatchComplete();
    });
  }, [matches, sessionId, personType, haptics, onMatchComplete]);

  if (confirmationResult) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-border p-6 text-center"
        style={{ background: "var(--card)" }}
      >
        <svg
          className="mx-auto mb-3 h-12 w-12"
          style={{ color: "var(--photo-matched)" }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Matching Complete
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {confirmationResult.matched} photo
          {confirmationResult.matched !== 1 ? "s" : ""} matched and set as current
          profile photo{confirmationResult.matched !== 1 ? "s" : ""}.
        </p>
        {confirmationResult.errors.length > 0 && (
          <div className="mt-3 space-y-1">
            {confirmationResult.errors.map((err, i) => (
              <p
                key={i}
                className="text-xs"
                style={{ color: "var(--photo-no-photo)" }}
              >
                {err}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {matchedCount} of {photos.length} photo
            {photos.length !== 1 ? "s" : ""} matched
          </span>
          <span
            className="ml-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ({highConfidence.length} high, {uncertain.length} uncertain,{" "}
            {unmatched.length} unmatched)
          </span>
        </div>
      </div>

      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* HIGH CONFIDENCE */}
      {highConfidence.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--photo-matched)" }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              High Confidence ({highConfidence.length})
            </h3>
          </div>
          <div className="space-y-2">
            {highConfidence.map((match) => (
              <MatchRow
                key={match.photoId}
                match={match}
                roster={roster}
                onReassign={handleReassign}
              />
            ))}
          </div>
        </div>
      )}

      {/* UNCERTAIN */}
      {uncertain.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--photo-unmatched)" }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Uncertain ({uncertain.length})
            </h3>
            <span
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Review and change if needed
            </span>
          </div>
          <div className="space-y-2">
            {uncertain.map((match) => (
              <MatchRow
                key={match.photoId}
                match={match}
                roster={roster}
                onReassign={handleReassign}
              />
            ))}
          </div>
        </div>
      )}

      {/* UNMATCHED */}
      {unmatched.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--photo-no-photo)" }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Unmatched ({unmatched.length})
            </h3>
            <span
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Assign a person manually
            </span>
          </div>
          <div className="space-y-2">
            {unmatched.map((match) => (
              <MatchRow
                key={match.photoId}
                match={match}
                roster={roster}
                onReassign={handleReassign}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirm All button */}
      <button
        type="button"
        onClick={handleConfirmAll}
        disabled={isPending || matchedCount === 0}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending
          ? "Confirming..."
          : `Confirm All Matches (${matchedCount})`}
      </button>
    </div>
  );
}
