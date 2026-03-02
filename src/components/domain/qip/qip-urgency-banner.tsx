"use client";

import type { QipDashboardSummary } from "@/lib/actions/qip";

interface QipUrgencyBannerProps {
  urgentItems: QipDashboardSummary["urgent_items"];
}

export function QipUrgencyBanner({ urgentItems }: QipUrgencyBannerProps) {
  if (urgentItems.length === 0) return null;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: "var(--attendance-absent-fg)",
        backgroundColor: "var(--attendance-absent-bg)",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg" aria-hidden>
          !
        </span>
        <div className="flex-1">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--attendance-absent-fg)" }}
          >
            {urgentItems.length} item{urgentItems.length !== 1 ? "s" : ""}{" "}
            need{urgentItems.length === 1 ? "s" : ""} attention
          </p>
          <ul className="mt-2 space-y-1">
            {urgentItems.map((item, i) => (
              <li
                key={i}
                className="text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
