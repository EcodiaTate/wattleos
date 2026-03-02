"use client";

import type { MedicalInfoData } from "@/types/ask-wattle";

const SEVERITY_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  mild: {
    bg: "color-mix(in srgb, var(--medical-mild) 12%, transparent)",
    color: "var(--medical-mild-fg)",
    label: "Mild",
  },
  moderate: {
    bg: "color-mix(in srgb, var(--medical-moderate) 12%, transparent)",
    color: "var(--medical-moderate-fg)",
    label: "Moderate",
  },
  severe: {
    bg: "color-mix(in srgb, var(--medical-severe) 15%, transparent)",
    color: "var(--medical-severe-fg)",
    label: "Severe",
  },
  life_threatening: {
    bg: "color-mix(in srgb, var(--medical-life-threatening) 15%, transparent)",
    color: "var(--medical-life-threatening-fg)",
    label: "Life-Threatening",
  },
};

interface Props {
  data: MedicalInfoData["data"];
}

export function MedicalInfoCard({ data }: Props) {
  const hasLifeThreatening = data.conditions.some(
    (c) => c.severity === "life_threatening",
  );

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: hasLifeThreatening
          ? "color-mix(in srgb, var(--destructive) 4%, transparent)"
          : "color-mix(in srgb, var(--medical-moderate) 6%, transparent)",
        border: `1px solid ${hasLifeThreatening ? "color-mix(in srgb, var(--destructive) 20%, transparent)" : "var(--wattle-border)"}`,
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            hasLifeThreatening
              ? "var(--medical-life-threatening)"
              : "var(--medical-moderate)"
          }
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--wattle-dark)" }}
        >
          Medical - {data.student_name}
        </span>
        <span
          className="ml-auto text-[10px] uppercase tracking-wider"
          style={{ color: "var(--wattle-tan)" }}
        >
          Sensitive
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {data.conditions.map((c) => {
          const severity = SEVERITY_STYLES[c.severity] ?? SEVERITY_STYLES.mild;
          return (
            <div
              key={c.id}
              className="rounded-lg px-2.5 py-2"
              style={{
                background: "color-mix(in srgb, var(--card) 50%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--wattle-dark)" }}
                >
                  {c.condition_name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: severity.bg, color: severity.color }}
                >
                  {severity.label}
                </span>
              </div>
              <span
                className="text-[11px]"
                style={{ color: "var(--wattle-brown)" }}
              >
                {c.condition_type}
              </span>
              {c.description && (
                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{ color: "var(--wattle-brown)" }}
                >
                  {c.description}
                </p>
              )}
              {c.requires_medication && (
                <div
                  className="mt-1 flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--medical-moderate-fg)" }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  {c.medication_name ?? "Medication required"}
                  {c.medication_location &&
                    ` - stored at: ${c.medication_location}`}
                </div>
              )}
              {c.action_plan && (
                <div
                  className="mt-1 rounded-md px-2 py-1 text-[11px]"
                  style={{
                    background:
                      "color-mix(in srgb, var(--medical-moderate) 8%, transparent)",
                    color: "var(--medical-moderate-fg)",
                  }}
                >
                  Action plan: {c.action_plan}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
