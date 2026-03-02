"use client";

import type { CheckInConfirmationData } from "@/types/ask-wattle";
import type { RevertState } from "@/lib/hooks/use-ask-wattle";
import type { RevertDescriptor } from "@/types/ask-wattle";
import { RevertButton } from "./revert-button";

interface Props {
  data: CheckInConfirmationData["data"];
  revert?: RevertDescriptor;
  revertState?: RevertState;
  onRevert: () => void;
}

export function CheckinConfirmationCard({
  data,
  revert,
  revertState,
  onRevert,
}: Props) {
  const time = new Date(data.checked_in_at).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background:
          "color-mix(in srgb, var(--attendance-present) 6%, transparent)",
        border:
          "1px solid color-mix(in srgb, var(--attendance-present) 15%, transparent)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--wattle-dark)" }}
            >
              {data.student_name}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background:
                  "color-mix(in srgb, var(--attendance-present) 12%, transparent)",
                color: "var(--attendance-present-fg)",
              }}
            >
              Checked In
            </span>
          </div>
          <span
            className="block text-[11px] mt-0.5"
            style={{ color: "var(--wattle-tan)" }}
          >
            {data.program_name} - {time}
          </span>
        </div>
        {revert && (
          <RevertButton
            label={revert.label}
            state={revertState ?? "idle"}
            onRevert={onRevert}
          />
        )}
      </div>
    </div>
  );
}
