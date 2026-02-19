// src/components/domain/programs/toggle-program-active-button.tsx
//
// ============================================================
// WattleOS V2 - Toggle Program Active/Inactive
// ============================================================
// Client component that toggles a program between active
// and inactive. Inactive programs don't appear in parent
// browse views and can't accept new bookings.
//
// WHY toggle not checkbox: This is a deliberate admin
// action that affects parent visibility. A toggle button
// with confirmation feels more intentional than a checkbox.
// ============================================================

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
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? "border-gray-300 text-gray-600 hover:bg-gray-50"
          : "border-green-300 text-green-700 hover:bg-green-50"
      }`}
    >
      {loading ? "Updating..." : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
