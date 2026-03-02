"use client";

import type { CustodyAlertData } from "@/types/ask-wattle";

const RESTRICTION_LABELS: Record<string, string> = {
  no_contact: "No Contact",
  no_pickup: "No Pickup",
  supervised_only: "Supervised Only",
  no_information: "No Information",
};

interface Props {
  data: CustodyAlertData["data"];
}

export function CustodyAlertCard({ data }: Props) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--destructive) 5%, transparent)",
        border:
          "1.5px solid color-mix(in srgb, var(--destructive) 25%, transparent)",
      }}
    >
      {/* Header with warning icon */}
      <div className="mb-2 flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--destructive)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--destructive)" }}
        >
          Custody Restrictions - {data.student_name}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {data.restrictions.map((r) => (
          <div
            key={r.id}
            className="rounded-lg px-2.5 py-2"
            style={{
              background:
                "color-mix(in srgb, var(--destructive) 4%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--destructive) 10%, transparent)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--destructive)" }}
              >
                {r.restricted_person_name}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 12%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                {RESTRICTION_LABELS[r.restriction_type] ?? r.restriction_type}
              </span>
            </div>
            {r.court_order_reference && (
              <span
                className="block text-[11px] mt-0.5"
                style={{ color: "var(--destructive)" }}
              >
                Court order: {r.court_order_reference}
              </span>
            )}
            {r.notes && (
              <p
                className="mt-1 text-[11px] leading-relaxed"
                style={{ color: "var(--wattle-brown)" }}
              >
                {r.notes}
              </p>
            )}
            <span
              className="block text-[10px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Effective: {r.effective_date}
              {r.expiry_date ? ` - Expires: ${r.expiry_date}` : " - No expiry"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
