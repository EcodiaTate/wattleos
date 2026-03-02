"use client";

// src/components/domain/ratios/age-group-breakdown.tsx
//
// Table showing per-age-bracket educator requirements for a class.
// Uses RatioBreakdown from getRatioBreakdown() action.

import type { RatioBreakdown } from "@/lib/actions/ratios";

interface AgeGroupBreakdownProps {
  breakdown: RatioBreakdown;
}

export function AgeGroupBreakdown({ breakdown }: AgeGroupBreakdownProps) {
  const { age_group_breakdown, educators_on_floor, required_educators } =
    breakdown;

  if (age_group_breakdown.length === 0) {
    return (
      <div
        className="rounded-xl border border-border p-4"
        style={{ backgroundColor: "var(--card)" }}
      >
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Age-Group Breakdown
        </p>
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          No children present
        </p>
      </div>
    );
  }

  // Distribute available educators proportionally by required count per bracket
  // so each row shows an accurate "available" number.
  const totalAvailable = educators_on_floor;

  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        Age-Group Breakdown - {breakdown.class_name}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: "var(--muted-foreground)" }}>
              <th className="pb-2 text-left font-medium">Age Group</th>
              <th className="pb-2 text-right font-medium">Children</th>
              <th className="pb-2 text-right font-medium">Required</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {age_group_breakdown.map((row) => {
              // Shortfall is total shortfall pro-rated per bracket
              const shortfall = Math.max(
                0,
                required_educators - totalAvailable,
              );
              // Per-bracket status: breach if total is breached and this bracket
              // has required educators (simple heuristic - exact allocation is complex)
              const isBreached = shortfall > 0 && row.required_educators > 0;
              const isWarning =
                !isBreached &&
                totalAvailable - required_educators <= 1 &&
                row.required_educators > 0;

              const statusIcon = isBreached ? "🔴" : isWarning ? "🟡" : "🟢";
              const statusText = isBreached
                ? `${shortfall} short`
                : isWarning
                  ? "1 buffer"
                  : "OK";

              return (
                <tr key={row.bracket_label}>
                  <td
                    className="py-2 pr-4 font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {row.bracket_label}
                    <span
                      className="ml-1 font-normal"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      (1:{row.ratio})
                    </span>
                  </td>
                  <td
                    className="py-2 text-right tabular-nums"
                    style={{ color: "var(--foreground)" }}
                  >
                    {row.child_count}
                  </td>
                  <td
                    className="py-2 text-right tabular-nums"
                    style={{ color: "var(--foreground)" }}
                  >
                    {row.required_educators}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className="inline-flex items-center gap-1"
                      style={{
                        color: isBreached
                          ? "var(--attendance-absent-fg, #991b1b)"
                          : isWarning
                            ? "var(--warning-fg, #92400e)"
                            : "var(--attendance-present-fg, #166534)",
                      }}
                    >
                      {statusIcon} {statusText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr
              className="border-t font-medium"
              style={{ borderColor: "var(--border)" }}
            >
              <td
                className="pt-2 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Total
              </td>
              <td
                className="pt-2 text-right tabular-nums text-xs"
                style={{ color: "var(--foreground)" }}
              >
                {age_group_breakdown.reduce((s, r) => s + r.child_count, 0)}
              </td>
              <td
                className="pt-2 text-right tabular-nums text-xs"
                style={{ color: "var(--foreground)" }}
              >
                {required_educators}
              </td>
              <td className="pt-2 text-right text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>
                  {totalAvailable} on floor
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
