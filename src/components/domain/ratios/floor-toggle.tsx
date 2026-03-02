"use client";

// src/components/domain/ratios/floor-toggle.tsx
//
// One-tap sign-in / sign-out toggle for educators.
// Calls toggleFloorSignIn() and notifies parent to refresh.

import { useTransition } from "react";
import { toggleFloorSignIn } from "@/lib/actions/ratios";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface FloorToggleProps {
  classId: string;
  isSignedIn: boolean;
  onRatioChange: () => void;
}

export function FloorToggle({
  classId,
  isSignedIn,
  onRatioChange,
}: FloorToggleProps) {
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleToggle() {
    haptics.selection();
    startTransition(async () => {
      const result = await toggleFloorSignIn({ class_id: classId });
      if (result.data) {
        if (result.data.signed_in) {
          haptics.success();
        } else {
          haptics.warning();
        }
        onRatioChange();
      } else {
        haptics.error();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="active-push touch-target w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
      style={{
        backgroundColor: isSignedIn
          ? "var(--attendance-present-bg)"
          : "var(--primary)",
        color: isSignedIn
          ? "var(--attendance-present-fg)"
          : "var(--primary-foreground)",
      }}
    >
      {isPending
        ? "Updating…"
        : isSignedIn
          ? "Sign Out from Floor"
          : "Sign In to Floor"}
    </button>
  );
}
