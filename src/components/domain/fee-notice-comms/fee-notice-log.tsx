"use client";

// src/components/domain/fee-notice-comms/fee-notice-log.tsx

import type { FeeNoticeWithDetails } from "@/types/domain";
import { FeeNoticeStatusPill } from "./fee-notice-status-pill";
import { FeeNoticeTriggerBadge } from "./fee-notice-trigger-badge";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  notices: FeeNoticeWithDetails[];
  title?: string;
  emptyMessage?: string;
}

export function FeeNoticeLog({
  notices,
  title = "Notice History",
  emptyMessage = "No notices yet.",
}: Props) {
  if (notices.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--foreground)" }}
        >
          {title}
        </h3>
      )}

      <div className="space-y-2">
        {notices.map((notice) => {
          const studentArr = Array.isArray(notice.student)
            ? notice.student
            : [notice.student];
          const student = studentArr[0];
          const guardianArr = Array.isArray(notice.guardian)
            ? notice.guardian
            : [notice.guardian];
          const guardian = guardianArr[0];
          const guardianUser = guardian?.user
            ? Array.isArray(guardian.user)
              ? guardian.user[0]
              : guardian.user
            : null;

          return (
            <div
              key={notice.id}
              className="card-interactive rounded-lg border border-border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FeeNoticeTriggerBadge trigger={notice.trigger_type} />
                    <FeeNoticeStatusPill status={notice.status} size="sm" />
                  </div>

                  <p
                    className="text-sm font-medium mt-1 truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {notice.invoice_number} - {student?.first_name}{" "}
                    {student?.last_name}
                  </p>

                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {formatCents(notice.amount_cents)} · Due{" "}
                    {formatDate(notice.due_date)}
                    {guardianUser &&
                      ` · To ${guardianUser.first_name} ${guardianUser.last_name}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {formatDate(notice.created_at)}
                  </p>

                  {/* Channel delivery indicators */}
                  {notice.deliveries && notice.deliveries.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {notice.deliveries.map((d) => (
                        <span
                          key={d.id}
                          className="text-[10px] px-1 rounded"
                          style={{
                            color: `var(--fee-notice-${d.status}-fg)`,
                            background: `var(--fee-notice-${d.status}-bg)`,
                          }}
                          title={`${d.channel}: ${d.status}${d.error_message ? ` - ${d.error_message}` : ""}`}
                        >
                          {d.channel === "email"
                            ? "E"
                            : d.channel === "sms"
                              ? "S"
                              : "P"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
