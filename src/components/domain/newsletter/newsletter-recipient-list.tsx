"use client";

import { useCallback, useState, useTransition } from "react";
import type { NewsletterRecipientWithUser } from "@/types/domain";
import { listNewsletterRecipients } from "@/lib/actions/comms/newsletter";
import { OpenRateBar } from "./open-rate-bar";

interface NewsletterRecipientListProps {
  newsletterId: string;
  recipientCount: number;
  readCount: number;
  initialRecipients: NewsletterRecipientWithUser[];
}

export function NewsletterRecipientList({
  newsletterId,
  recipientCount,
  readCount,
  initialRecipients,
}: NewsletterRecipientListProps) {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [showOpenedOnly, setShowOpenedOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFilterToggle = useCallback(() => {
    const next = !showOpenedOnly;
    setShowOpenedOnly(next);
    startTransition(async () => {
      const result = await listNewsletterRecipients({
        newsletter_id: newsletterId,
        opened_only: next,
        per_page: 50,
      });
      if (!result.error) {
        setRecipients(result.data);
      }
    });
  }, [newsletterId, showOpenedOnly]);

  return (
    <div className="space-y-4">
      <OpenRateBar recipientCount={recipientCount} readCount={readCount} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Recipients ({recipientCount})
        </h3>
        <button
          onClick={handleFilterToggle}
          disabled={isPending}
          className="rounded-lg border border-border px-2 py-1 text-xs font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          {showOpenedOnly ? "Show All" : "Opened Only"}
        </button>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {recipients.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              {r.user?.avatar_url ? (
                <img
                  src={r.user.avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                  style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                >
                  {r.user?.first_name?.[0] ?? "?"}
                </div>
              )}
              <div>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>
                  {r.user?.first_name} {r.user?.last_name}
                </p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {r.email}
                </p>
              </div>
            </div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {r.opened_at ? (
                <span style={{ color: "var(--newsletter-sent)" }}>
                  Opened{" "}
                  {new Date(r.opened_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : r.delivered_at ? (
                <span>Delivered</span>
              ) : (
                <span>Pending</span>
              )}
            </div>
          </div>
        ))}
        {recipients.length === 0 && (
          <p className="py-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            {showOpenedOnly ? "No one has opened this newsletter yet." : "No recipients."}
          </p>
        )}
      </div>
    </div>
  );
}
