import type { ExcursionWithDetails } from "@/lib/actions/excursions";

interface ExcursionTimelineProps {
  excursion: ExcursionWithDetails;
}

interface TimelineEvent {
  label: string;
  time: string | null;
  detail?: string;
  status: "completed" | "current" | "upcoming";
}

export function ExcursionTimeline({ excursion }: ExcursionTimelineProps) {
  const events: TimelineEvent[] = [];

  // 1. Created
  events.push({
    label: "Excursion Created",
    time: excursion.created_at,
    status: "completed",
  });

  // 2. Risk Assessment
  if (excursion.risk_assessment) {
    events.push({
      label: "Risk Assessment Completed",
      time: excursion.risk_assessment.created_at,
      detail: `Overall: ${excursion.risk_assessment.overall_risk_rating ?? "N/A"} - ${excursion.risk_assessment.hazards.length} hazard(s)`,
      status: "completed",
    });

    if (excursion.risk_assessment.approved_at) {
      events.push({
        label: "Risk Assessment Approved",
        time: excursion.risk_assessment.approved_at,
        status: "completed",
      });
    }
  } else if (excursion.status === "planning") {
    events.push({
      label: "Risk Assessment",
      time: null,
      status: "current",
    });
  }

  // 3. Consents
  const totalConsents = excursion.consents.length;
  const consentedCount = excursion.consents.filter(
    (c) => c.consent_status === "consented",
  ).length;

  if (totalConsents > 0) {
    const allDone = consentedCount === totalConsents;
    const isConsentsPhase = excursion.status === "consents_pending";

    events.push({
      label: "Parent Consents",
      time: allDone
        ? (excursion.consents
            .filter((c) => c.consented_at)
            .sort((a, b) =>
              (b.consented_at ?? "").localeCompare(a.consented_at ?? ""),
            )[0]?.consented_at ?? null)
        : null,
      detail: `${consentedCount}/${totalConsents} received`,
      status: allDone ? "completed" : isConsentsPhase ? "current" : "upcoming",
    });
  }

  // 4. Departure
  if (excursion.departed_at) {
    events.push({
      label: "Departed",
      time: excursion.departed_at,
      status: "completed",
    });
  } else if (["ready_to_depart"].includes(excursion.status)) {
    events.push({
      label: "Departure",
      time: null,
      status: "current",
    });
  }

  // 5. Headcounts
  for (const hc of excursion.headcounts) {
    events.push({
      label: `Headcount: ${hc.count}/${excursion.attending_student_ids.length}`,
      time: hc.recorded_at,
      detail: hc.location_note ?? undefined,
      status: "completed",
    });
  }

  // 6. Return
  if (excursion.returned_at) {
    events.push({
      label: "Returned",
      time: excursion.returned_at,
      detail: excursion.return_notes ?? undefined,
      status: "completed",
    });
  } else if (excursion.status === "in_progress") {
    events.push({
      label: "Return",
      time: null,
      status: "current",
    });
  }

  // 7. Cancelled
  if (excursion.status === "cancelled") {
    events.push({
      label: "Cancelled",
      time: null,
      status: "completed",
    });
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        return (
          <div key={idx} className="relative flex gap-3 pb-4">
            {/* Vertical line */}
            {!isLast && (
              <div
                className="absolute left-[7px] top-4 bottom-0 w-0.5"
                style={{
                  background:
                    event.status === "completed"
                      ? "var(--primary)"
                      : "var(--border)",
                }}
              />
            )}

            {/* Dot */}
            <div className="relative mt-1 flex-shrink-0">
              <div
                className="h-[15px] w-[15px] rounded-full border-2"
                style={{
                  borderColor:
                    event.status === "completed"
                      ? "var(--primary)"
                      : event.status === "current"
                        ? "var(--warning)"
                        : "var(--border)",
                  background:
                    event.status === "completed"
                      ? "var(--primary)"
                      : "transparent",
                }}
              />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-medium"
                style={{
                  color:
                    event.status === "upcoming"
                      ? "var(--muted-foreground)"
                      : "var(--foreground)",
                }}
              >
                {event.label}
              </p>
              {event.time && (
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {new Date(event.time).toLocaleString("en-AU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {event.detail && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {event.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
