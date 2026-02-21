// src/components/domain/programs/generate-sessions-button.tsx
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
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="space-y-[var(--density-md)]">
      <div className="flex items-center gap-[var(--density-sm)]">
        <select
          value={weeks}
          onChange={(e) => setWeeks(parseInt(e.target.value, 10))}
          className="rounded-lg border border-input bg-card px-[var(--density-input-padding-x)] h-[var(--density-input-height)] text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-[var(--transition-fast)]"
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
          className="flex-1 rounded-lg bg-primary px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-bold text-primary-foreground hover:opacity-90 transition-[var(--transition-base)] disabled:opacity-50 shadow-sm"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      {result && (
        <p className="text-xs text-success font-medium">
          Created {result.created} session{result.created !== 1 ? "s" : ""}.
          {result.skipped > 0 && ` ${result.skipped} already existed.`}
        </p>
      )}
    </div>
  );
}