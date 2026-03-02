"use client";

import type { ExcursionConsent, ExcursionConsentStatus } from "@/types/domain";

interface ConsentTrackerProps {
  consents: ExcursionConsent[];
  /** Map of student_id → display name */
  studentNames: Record<string, string>;
}

const STATUS_STYLES: Record<
  ExcursionConsentStatus,
  { bg: string; fg: string; label: string }
> = {
  pending: {
    bg: "var(--excursion-consents-pending-bg)",
    fg: "var(--excursion-consents-pending)",
    label: "Pending",
  },
  consented: {
    bg: "color-mix(in srgb, var(--success) 12%, transparent)",
    fg: "var(--success)",
    label: "Consented",
  },
  declined: {
    bg: "color-mix(in srgb, var(--destructive) 12%, transparent)",
    fg: "var(--destructive)",
    label: "Declined",
  },
};

export function ConsentTracker({
  consents,
  studentNames,
}: ConsentTrackerProps) {
  const total = consents.length;
  const consented = consents.filter(
    (c) => c.consent_status === "consented",
  ).length;
  const declined = consents.filter(
    (c) => c.consent_status === "declined",
  ).length;
  const pending = consents.filter((c) => c.consent_status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span style={{ color: "var(--foreground)" }}>
          <span className="font-semibold">{consented}</span>/{total} consented
        </span>
        {declined > 0 && (
          <span style={{ color: "var(--destructive)" }}>
            {declined} declined
          </span>
        )}
        {pending > 0 && (
          <span style={{ color: "var(--muted-foreground)" }}>
            {pending} pending
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--muted)" }}
        >
          <div className="flex h-full">
            {consented > 0 && (
              <div
                className="h-full transition-all"
                style={{
                  width: `${(consented / total) * 100}%`,
                  background: "var(--success)",
                }}
              />
            )}
            {declined > 0 && (
              <div
                className="h-full transition-all"
                style={{
                  width: `${(declined / total) * 100}%`,
                  background: "var(--destructive)",
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Per-student grid */}
      <div className="space-y-1.5">
        {consents.map((consent) => {
          const style = STATUS_STYLES[consent.consent_status];
          const name = studentNames[consent.student_id] ?? "Unknown Student";

          return (
            <div
              key={consent.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2"
              style={{ background: "var(--card)" }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {name}
                </p>
                {consent.consented_at && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {consent.consented_by_name &&
                      `${consent.consented_by_name} - `}
                    {new Date(consent.consented_at).toLocaleDateString(
                      "en-AU",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                    {consent.method && consent.method !== "digital_portal" && (
                      <span className="ml-1">
                        ({consent.method === "paper" ? "Paper" : "Verbal"})
                      </span>
                    )}
                  </p>
                )}
              </div>
              <span
                className="ml-3 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: style.bg, color: style.fg }}
              >
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
