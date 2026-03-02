"use client";

import type { StudentInfoData } from "@/types/ask-wattle";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: "color-mix(in srgb, var(--enrollment-active) 12%, transparent)", color: "var(--enrollment-active-fg)" },
  inquiry: { bg: "color-mix(in srgb, var(--enrollment-inquiry) 12%, transparent)", color: "var(--enrollment-inquiry-fg)" },
  applicant: { bg: "color-mix(in srgb, var(--enrollment-applicant) 12%, transparent)", color: "var(--enrollment-applicant-fg)" },
  withdrawn: { bg: "color-mix(in srgb, var(--enrollment-withdrawn) 12%, transparent)", color: "var(--enrollment-withdrawn-fg)" },
  graduated: { bg: "color-mix(in srgb, var(--enrollment-graduated) 12%, transparent)", color: "var(--enrollment-graduated-fg)" },
};

interface Props {
  data: StudentInfoData["data"];
}

export function StudentInfoCard({ data }: Props) {
  const statusStyle = STATUS_STYLES[data.enrollment_status] ?? STATUS_STYLES.active;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      {/* Avatar placeholder */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium"
        style={{ background: "color-mix(in srgb, var(--wattle-gold) 15%, transparent)", color: "var(--wattle-brown)" }}
      >
        {data.first_name[0]}{data.last_name[0]}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: "var(--wattle-dark)" }}>
            {data.display_name}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {data.enrollment_status}
          </span>
        </div>
        {data.class_names.length > 0 && (
          <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
            {data.class_names.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
