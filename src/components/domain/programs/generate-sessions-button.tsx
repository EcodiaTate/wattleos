// src/components/domain/programs/generate-sessions-button.tsx
//
// ============================================================
// WattleOS V2 - Generate Sessions Button
// ============================================================
// Client component that triggers bulk session generation
// for a program. Shows a weeks selector and result summary.
//
// WHY separate component: Has interactive state (loading,
// result display). Used on the program detail page.
// ============================================================

"use client";

import { generateSessions } from "@/lib/actions/programs/programs";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface GenerateSessionsButtonProps {
  programId: string;
}

export function GenerateSessionsButton({
  programId,
}: GenerateSessionsButtonProps) {
  const router = useRouter();
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await generateSessions(programId, weeks);

    if (res.error) {
      setError(res.error.message);
    } else if (res.data) {
      setResult(res.data);
      // Refresh the page to show new sessions
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={weeks}
          onChange={(e) => setWeeks(parseInt(e.target.value, 10))}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
          disabled={loading}
        >
          <option value={2}>2 weeks</option>
          <option value={4}>4 weeks</option>
          <option value={8}>8 weeks</option>
          <option value={12}>12 weeks (term)</option>
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <p className="text-xs text-green-700">
          Created {result.created} session{result.created !== 1 ? "s" : ""}.
          {result.skipped > 0 && ` ${result.skipped} already existed.`}
        </p>
      )}
    </div>
  );
}
