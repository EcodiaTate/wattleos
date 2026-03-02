"use client";

// src/components/domain/ratios/room-ratio-card.tsx
//
// Per-room card showing live ratio state with educator list
// and floor sign-in toggle.

import type { LiveRatioState } from "@/types/domain";
import { RatioBadge } from "./ratio-badge";
import { FloorToggle } from "./floor-toggle";

interface RoomRatioCardProps {
  ratio: LiveRatioState;
  canSignIn: boolean;
  currentUserId: string;
  onRatioChange: () => void;
}

export function RoomRatioCard({
  ratio,
  canSignIn,
  currentUserId,
  onRatioChange,
}: RoomRatioCardProps) {
  const isSignedIn = ratio.educators_on_floor_details.some(
    (e) => e.id === currentUserId,
  );

  // Ratio display: "educators : children"
  const ratioDisplay =
    ratio.children_present === 0
      ? "No children"
      : `${ratio.educators_on_floor}:${ratio.children_present}`;

  const requiredDisplay =
    ratio.required_ratio_denominator > 0
      ? `Required: 1:${ratio.required_ratio_denominator}`
      : "";

  return (
    <div
      className="card-interactive flex flex-col gap-3 rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {ratio.class_name}
        </h3>
        <RatioBadge isCompliant={ratio.is_compliant} />
      </div>

      {/* Large ratio display */}
      <div
        className="flex items-center justify-center rounded-lg py-4"
        style={{
          backgroundColor: ratio.is_compliant
            ? "var(--attendance-present-bg)"
            : "var(--attendance-absent-bg)",
        }}
      >
        <span
          className="text-3xl font-bold tabular-nums"
          style={{
            color: ratio.is_compliant
              ? "var(--attendance-present-fg)"
              : "var(--attendance-absent-fg)",
          }}
        >
          {ratioDisplay}
        </span>
      </div>

      {/* Required ratio + counts */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--muted-foreground)" }}>
          {requiredDisplay}
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          {ratio.educators_on_floor} educator
          {ratio.educators_on_floor !== 1 ? "s" : ""} · {ratio.children_present}{" "}
          child{ratio.children_present !== 1 ? "ren" : ""}
        </span>
      </div>

      {/* Educators on floor list */}
      {ratio.educators_on_floor_details.length > 0 && (
        <div className="space-y-1">
          <p
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            On Floor
          </p>
          <div className="flex flex-wrap gap-1">
            {ratio.educators_on_floor_details.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--foreground)",
                }}
              >
                {e.first_name} {e.last_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Floor toggle */}
      {canSignIn && (
        <FloorToggle
          classId={ratio.class_id}
          isSignedIn={isSignedIn}
          onRatioChange={onRatioChange}
        />
      )}
    </div>
  );
}
