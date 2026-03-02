// src/lib/utils/filename-matching.ts
//
// ============================================================
// WattleOS V2 - Filename → Person Matching (Module R)
// ============================================================
// Client-side utility for matching uploaded photo filenames to
// student/staff roster entries. Used during bulk photo upload.
//
// WHY client-side: The roster is already fetched for the UI.
// Running matching on the client avoids a round-trip per file
// and lets us show instant previews during drag-and-drop.
//
// STRATEGY (tried in order):
//   1. Exact match on "{last}_{first}" or "{last}-{first}"
//   2. Exact match on "{first}_{last}" or "{first}-{last}"
//   3. Exact match on "{first}.{last}" (email-style)
//   4. Numeric prefix matches a known person ID
//   5. Fuzzy match via Levenshtein distance (threshold ≤ 2)
//   6. Partial match on last name only
// ============================================================

export type MatchConfidence = "high" | "medium" | "low" | "none";

export interface PersonRosterEntry {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
}

export interface MatchResult {
  confidence: MatchConfidence;
  person_id: string | null;
  person_name: string | null;
  match_reason: string | null;
}

// ── Main Matching Function ───────────────────────────────────

export function matchFilenameToRoster(
  filename: string,
  roster: PersonRosterEntry[],
): MatchResult {
  const parsed = parseFilename(filename);
  if (parsed.parts.length === 0) {
    return {
      confidence: "none",
      person_id: null,
      person_name: null,
      match_reason: null,
    };
  }

  // Strategy 1 & 2: Exact match on two-part name patterns
  if (parsed.parts.length >= 2) {
    // Try last_first
    const lastFirst = findExactMatch(
      parsed.parts[0],
      parsed.parts[1],
      roster,
      "last_first",
    );
    if (lastFirst) return lastFirst;

    // Try first_last
    const firstLast = findExactMatch(
      parsed.parts[1],
      parsed.parts[0],
      roster,
      "first_last",
    );
    if (firstLast) return firstLast;
  }

  // Strategy 3: Single part - try as last name exact match
  if (parsed.parts.length === 1) {
    const lastNameOnly = roster.filter(
      (p) => normalizeForMatch(p.last_name) === parsed.parts[0],
    );
    if (lastNameOnly.length === 1) {
      return {
        confidence: "medium",
        person_id: lastNameOnly[0].id,
        person_name: formatName(lastNameOnly[0]),
        match_reason: "Last name match",
      };
    }
  }

  // Strategy 4: Numeric prefix - matches a person ID fragment
  const numericPrefix = filename.replace(/\.[^.]+$/, "").replace(/\D/g, "");
  if (numericPrefix.length >= 4) {
    const idMatch = roster.find((p) => p.id.startsWith(numericPrefix));
    if (idMatch) {
      return {
        confidence: "medium",
        person_id: idMatch.id,
        person_name: formatName(idMatch),
        match_reason: "ID prefix match",
      };
    }
  }

  // Strategy 5: Fuzzy match (Levenshtein) on full name
  if (parsed.parts.length >= 2) {
    const inputName = parsed.parts.join(" ");
    let bestMatch: PersonRosterEntry | null = null;
    let bestDistance = Infinity;

    for (const person of roster) {
      // Try both orderings
      const lastFirst = normalizeForMatch(
        `${person.last_name} ${person.first_name}`,
      );
      const firstLast = normalizeForMatch(
        `${person.first_name} ${person.last_name}`,
      );

      const d1 = levenshteinDistance(inputName, lastFirst);
      const d2 = levenshteinDistance(inputName, firstLast);
      const minDist = Math.min(d1, d2);

      if (minDist < bestDistance) {
        bestDistance = minDist;
        bestMatch = person;
      }
    }

    if (bestMatch && bestDistance <= 2) {
      return {
        confidence: bestDistance === 0 ? "high" : "medium",
        person_id: bestMatch.id,
        person_name: formatName(bestMatch),
        match_reason: `Fuzzy match (distance: ${bestDistance})`,
      };
    }

    // Strategy 6: Partial last name fuzzy match
    if (bestMatch && bestDistance <= 4) {
      const lastNameDist = levenshteinDistance(
        parsed.parts[0],
        normalizeForMatch(bestMatch.last_name),
      );
      if (lastNameDist <= 1) {
        return {
          confidence: "low",
          person_id: bestMatch.id,
          person_name: formatName(bestMatch),
          match_reason: `Partial last name match (distance: ${lastNameDist})`,
        };
      }
    }
  }

  return {
    confidence: "none",
    person_id: null,
    person_name: null,
    match_reason: null,
  };
}

// ── Batch Matching ───────────────────────────────────────────

export function matchAllFilenames(
  filenames: string[],
  roster: PersonRosterEntry[],
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();
  for (const filename of filenames) {
    results.set(filename, matchFilenameToRoster(filename, roster));
  }
  return results;
}

// ── Helpers ──────────────────────────────────────────────────

interface ParsedFilename {
  parts: string[];
  original: string;
}

export function parseFilename(filename: string): ParsedFilename {
  // Strip extension
  const nameOnly = filename.replace(/\.[^.]+$/, "");

  // Replace separators with spaces, collapse whitespace
  const cleaned = nameOnly
    .replace(/[_\-\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize each part for matching
  const parts = cleaned
    .split(" ")
    .map(normalizeForMatch)
    .filter((p) => p.length > 0);

  return { parts, original: filename };
}

export function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]/g, "") // strip non-alphanumeric
    .trim();
}

function findExactMatch(
  lastPart: string,
  firstPart: string,
  roster: PersonRosterEntry[],
  reason: string,
): MatchResult | null {
  const match = roster.find((p) => {
    const normLast = normalizeForMatch(p.last_name);
    const normFirst = normalizeForMatch(p.first_name);
    const normPreferred = p.preferred_name
      ? normalizeForMatch(p.preferred_name)
      : null;

    return (
      normLast === lastPart &&
      (normFirst === firstPart ||
        (normPreferred !== null && normPreferred === firstPart))
    );
  });

  if (match) {
    return {
      confidence: "high",
      person_id: match.id,
      person_name: formatName(match),
      match_reason: `Exact ${reason} match`,
    };
  }

  return null;
}

function formatName(person: PersonRosterEntry): string {
  const display = person.preferred_name || person.first_name;
  return `${display} ${person.last_name}`;
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
