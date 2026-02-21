// src/components/domain/programs/toggle-program-active-button.tsx
"use client";

import { updateProgram } from "@/lib/actions/programs/programs";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ToggleProgramActiveButtonProps {
  programId: string;
  isActive: boolean;
}

export function ToggleProgramActiveButton({
  programId,
  isActive,
}: ToggleProgramActiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await updateProgram(programId, { is_active: !isActive });

    if (!result.error) {
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-lg border px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-bold transition-[var(--transition-base)] disabled:opacity-50 ${
        isActive
          ? "border-border text-muted-foreground hover:bg-muted"
          : "border-success/30 text-success bg-success/5 hover:bg-success/10"
      }`}
    >
      {loading ? "Updating..." : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}