"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { NewsletterWithDetails } from "@/types/domain";
import {
  getNewslettersForParent,
  recordReadReceipt,
} from "@/lib/actions/comms/newsletter";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ParentNewsletterFeedProps {
  initialNewsletters: NewsletterWithDetails[];
  initialTotal: number;
}

export function ParentNewsletterFeed({
  initialNewsletters,
  initialTotal,
}: ParentNewsletterFeedProps) {
  const haptics = useHaptics();
  const [newsletters, setNewsletters] = useState(initialNewsletters);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const perPage = 10;
  const totalPages = Math.ceil(total / perPage);

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const nextPage = page + 1;
      const result = await getNewslettersForParent({
        page: nextPage,
        per_page: perPage,
      });
      if (!result.error) {
        setNewsletters((prev) => [...prev, ...result.data]);
        setTotal(result.pagination.total);
        setPage(nextPage);
      }
    });
  }, [page]);

  const handleExpand = useCallback(
    (id: string) => {
      haptics.impact("light");
      setExpandedId((prev) => (prev === id ? null : id));
      // Record read receipt when opening
      recordReadReceipt(id);
    },
    [haptics],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
        Newsletters
      </h1>

      {newsletters.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-3xl" style={{ color: "var(--empty-state-icon)" }}>
            📰
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No newsletters have been sent yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <div
              key={nl.id}
              className="rounded-lg border border-border overflow-hidden"
              style={{ backgroundColor: "var(--card)" }}
            >
              <button
                onClick={() => handleExpand(nl.id)}
                className="active-push w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {nl.title}
                    </h3>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {nl.subject_line}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {nl.sent_at
                      ? new Date(nl.sent_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </span>
                </div>
                {nl.author && (
                  <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    From {nl.author.first_name} {nl.author.last_name}
                  </p>
                )}
              </button>

              {expandedId === nl.id && (
                <div
                  className="border-t px-4 py-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    className="prose max-w-none text-sm"
                    style={{ color: "var(--foreground)" }}
                    dangerouslySetInnerHTML={{ __html: nl.body_html }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {page < totalPages && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {isPending ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
