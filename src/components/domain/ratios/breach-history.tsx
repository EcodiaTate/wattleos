"use client";

// src/components/domain/ratios/breach-history.tsx
//
// Historical breach log table with acknowledge button.

import { useState, useTransition } from "react";
import { acknowledgeRatioBreach } from "@/lib/actions/ratios";
import type { BreachHistoryEntry } from "@/lib/actions/ratios";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { RatioBadge } from "./ratio-badge";

interface BreachHistoryProps {
  breaches: BreachHistoryEntry[];
  canAcknowledge: boolean;
}

export function BreachHistory({
  breaches,
  canAcknowledge,
}: BreachHistoryProps) {
  const [items, setItems] = useState(breaches);
  const [pending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleAcknowledge(logId: string) {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await acknowledgeRatioBreach({ log_id: logId });
      if (result.data) {
        haptics.success();
        setItems((prev) =>
          prev.map((item) =>
            item.id === logId
              ? {
                  ...item,
                  breach_acknowledged_by: result.data!.breach_acknowledged_by,
                  breach_acknowledged_at: result.data!.breach_acknowledged_at,
                }
              : item,
          ),
        );
      } else {
        haptics.error();
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p
          className="text-sm"
          style={{ color: "var(--empty-state-icon)" }}
        >
          No ratio breaches recorded
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        Recent Breaches
      </h3>
      <div className="scroll-native overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                backgroundColor: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              <th className="px-3 py-2 text-left text-xs font-medium">
                Date / Time
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium">
                Class
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium">
                Children
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium">
                Educators
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium">
                Required
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium">
                Status
              </th>
              {canAcknowledge && (
                <th className="px-3 py-2 text-right text-xs font-medium">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((breach) => {
              const dt = new Date(breach.logged_at);
              const dateStr = dt.toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
              });
              const timeStr = dt.toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isAcknowledged = !!breach.breach_acknowledged_at;

              return (
                <tr
                  key={breach.id}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td
                    className="whitespace-nowrap px-3 py-2 text-xs"
                    style={{ color: "var(--foreground)" }}
                  >
                    {dateStr} {timeStr}
                  </td>
                  <td
                    className="px-3 py-2 text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {breach.class_name}
                  </td>
                  <td
                    className="px-3 py-2 text-center text-xs"
                    style={{ color: "var(--foreground)" }}
                  >
                    {breach.children_present}
                  </td>
                  <td
                    className="px-3 py-2 text-center text-xs"
                    style={{ color: "var(--foreground)" }}
                  >
                    {breach.educators_on_floor}
                  </td>
                  <td
                    className="px-3 py-2 text-center text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    1:{breach.required_ratio_denominator}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isAcknowledged ? (
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: "var(--attendance-excused-bg)",
                          color: "var(--attendance-excused-fg)",
                        }}
                      >
                        Acknowledged
                      </span>
                    ) : (
                      <RatioBadge isCompliant={false} compact />
                    )}
                  </td>
                  {canAcknowledge && (
                    <td className="px-3 py-2 text-right">
                      {!isAcknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(breach.id)}
                          disabled={pending}
                          className="active-push touch-target rounded px-2 py-1 text-xs font-medium transition-opacity disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
